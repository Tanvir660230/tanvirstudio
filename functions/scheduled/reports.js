const { onSchedule } = require("firebase-functions/v2/scheduler");
const { admin, db, EMAIL_USER, EMAIL_PASS, ADMIN_EMAIL_SEC } = require("../lib/init");
const { makeTransport, withRetry, getDeadlineMs } = require("../lib/helpers");
const { htmlWrap, btn, para } = require("../lib/email-templates");

// ─── Weekly revenue report (Monday 9am Dhaka = Monday 3am UTC) ───────────────
exports.weeklyRevenueReport = onSchedule(
  { schedule: "0 3 * * 1", timeZone: "Asia/Dhaka", secrets: [EMAIL_USER, EMAIL_PASS, ADMIN_EMAIL_SEC] },
  async () => {
    const adminEmail = ADMIN_EMAIL_SEC.value();
    if (!adminEmail) return;

    const weekAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 7 * 86400 * 1000);
    const now     = new Date();
    const weekAgoDate = new Date(Date.now() - 7 * 86400 * 1000);
    const weekStr = `${weekAgoDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

    const twoWeeksAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 14 * 86400 * 1000);

    const [txSnap, prevTxSnap, taskSnap] = await Promise.all([
      db.collection("transactions").where("createdAt", ">=", weekAgo).get().catch(() => ({ docs: [] })),
      db.collection("transactions").where("createdAt", ">=", twoWeeksAgo).where("createdAt", "<", weekAgo).get().catch(() => ({ docs: [] })),
      db.collection("tasks").where("createdAt", ">=", weekAgo).get().catch(() => ({ docs: [] })),
    ]);

    let income = 0, expenses = 0, prevIncome = 0;
    txSnap.docs.forEach((d) => {
      const { type, amount = 0 } = d.data();
      if (type === "in")  income   += Number(amount);
      if (type === "out") expenses += Number(amount);
    });
    prevTxSnap.docs.forEach((d) => {
      if (d.data().type === "in") prevIncome += Number(d.data().amount || 0);
    });
    const revenueDropPct = prevIncome > 0 ? Math.round((1 - income / prevIncome) * 100) : 0;

    const tasks = taskSnap.docs.map((d) => d.data());
    const ordersReceived  = tasks.length;
    const ordersCompleted = tasks.filter((t) => t.status === "completed").length;

    // Find top package by order count
    const pkgCount = {};
    tasks.forEach(({ packageName }) => {
      if (packageName) pkgCount[packageName] = (pkgCount[packageName] || 0) + 1;
    });
    const topPackage = Object.entries(pkgCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const net = income - expenses;

    const bodyHtml = `
      <h2 style="color:#1a0a2e;margin:0 0 6px;font-size:20px">Weekly Studio Report</h2>
      <p style="color:#aaa;font-size:13px;margin:0 0 24px">${weekStr}</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
        <tr>
          <td style="text-align:center;padding:16px 8px;background:#f0fdf4;border-radius:8px">
            <p style="color:#16a34a;font-size:22px;font-weight:700;margin:0">&#2547;${income.toLocaleString()}</p>
            <p style="color:#555;font-size:12px;margin:4px 0 0">Income</p>
          </td>
          <td width="12"></td>
          <td style="text-align:center;padding:16px 8px;background:#fef2f2;border-radius:8px">
            <p style="color:#dc2626;font-size:22px;font-weight:700;margin:0">&#2547;${expenses.toLocaleString()}</p>
            <p style="color:#555;font-size:12px;margin:4px 0 0">Expenses</p>
          </td>
          <td width="12"></td>
          <td style="text-align:center;padding:16px 8px;background:#eff6ff;border-radius:8px">
            <p style="color:#2563eb;font-size:22px;font-weight:700;margin:0">&#2547;${net.toLocaleString()}</p>
            <p style="color:#555;font-size:12px;margin:4px 0 0">Net</p>
          </td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden">
        <tr style="background:#f9f9f9">
          <td style="padding:10px 16px;color:#888;font-size:12px;font-weight:600;text-transform:uppercase">Metric</td>
          <td style="padding:10px 16px;color:#888;font-size:12px;font-weight:600;text-transform:uppercase;text-align:right">Value</td>
        </tr>
        <tr><td style="padding:12px 16px;color:#333;font-size:14px;border-top:1px solid #eee">Orders Received</td>
          <td style="padding:12px 16px;color:#333;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #eee">${ordersReceived}</td></tr>
        <tr><td style="padding:12px 16px;color:#333;font-size:14px;border-top:1px solid #eee">Orders Completed</td>
          <td style="padding:12px 16px;color:#333;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #eee">${ordersCompleted}</td></tr>
        <tr><td style="padding:12px 16px;color:#333;font-size:14px;border-top:1px solid #eee">Top Package</td>
          <td style="padding:12px 16px;color:#333;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #eee">${topPackage}</td></tr>
        <tr><td style="padding:12px 16px;color:#333;font-size:14px;border-top:1px solid #eee">vs Last Week</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:700;text-align:right;border-top:1px solid #eee;color:${revenueDropPct >= 40 ? "#dc2626" : revenueDropPct > 0 ? "#d97706" : "#16a34a"}">
            ${prevIncome > 0 ? (revenueDropPct > 0 ? `▼ ${revenueDropPct}% drop` : `▲ ${Math.abs(revenueDropPct)}% up`) : "N/A"}
          </td></tr>
      </table>
      ${revenueDropPct >= 40 ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin-top:16px">
        <p style="color:#dc2626;font-weight:700;margin:0 0 4px;font-size:14px">⚠️ Revenue Anomaly Detected</p>
        <p style="color:#555;font-size:13px;margin:0">This week's income (৳${income.toLocaleString()}) is ${revenueDropPct}% below last week (৳${prevIncome.toLocaleString()}). Consider reviewing pricing or running a promotion.</p>
      </div>` : ""}
    `;

    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    await withRetry(() => transport.sendMail({
      from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
      to:      adminEmail,
      subject: `Weekly Report — ${weekStr}`,
      html:    htmlWrap("Weekly Studio Report", bodyHtml),
      text:    `Weekly Report (${weekStr})\n\nIncome: ৳${income}\nExpenses: ৳${expenses}\nNet: ৳${net}\nOrders Received: ${ordersReceived}\nOrders Completed: ${ordersCompleted}\nTop Package: ${topPackage}`,
    }));

    console.log(`Weekly report sent. Income: ${income}, Net: ${net}`);
  }
);

// ─── Morning digest — admin summary email, skips quiet days (daily 7am Dhaka) ─
exports.morningDigest = onSchedule(
  { schedule: "0 7 * * *", timeZone: "Asia/Dhaka", secrets: [EMAIL_USER, EMAIL_PASS, ADMIN_EMAIL_SEC] },
  async () => {
    const adminEmail = ADMIN_EMAIL_SEC.value();
    if (!adminEmail) return;

    const now       = Date.now();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [pendingSnap, activeSnap, weekTxSnap] = await Promise.all([
      db.collection("tasks").where("status", "==", "pending").get().catch(() => ({ size: 0, docs: [] })),
      db.collection("tasks").where("status", "in", ["pending", "accepted", "in_progress"]).get().catch(() => ({ docs: [] })),
      db.collection("transactions").where("createdAt", ">=", admin.firestore.Timestamp.fromMillis(now - 7 * 86400 * 1000)).get().catch(() => ({ docs: [] })),
    ]);

    const dueToday = activeSnap.docs.filter((d) => {
      const ms = getDeadlineMs(d.data());
      return ms && ms >= todayStart.getTime() && ms <= todayEnd.getTime();
    }).length;

    const overdue = activeSnap.docs.filter((d) => {
      const ms = getDeadlineMs(d.data());
      return ms && ms < todayStart.getTime();
    }).length;

    let weekRevenue = 0;
    weekTxSnap.docs.forEach((d) => { const { type, amount = 0 } = d.data(); if (type === "in") weekRevenue += Number(amount); });

    const pendingCount = pendingSnap.size || 0;

    // Skip if nothing actionable
    if (pendingCount === 0 && dueToday === 0 && overdue === 0) { console.log("Quiet morning — digest skipped"); return; }

    const mkRow = (label, value, color) =>
      `<tr><td style="padding:11px 16px;color:#555;font-size:14px;border-top:1px solid #eee">${label}</td>
       <td style="padding:11px 16px;font-size:15px;font-weight:700;text-align:right;border-top:1px solid #eee;color:${color}">${value}</td></tr>`;

    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    await withRetry(() => transport.sendMail({
      from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
      to:      adminEmail,
      subject: `Morning Digest — ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}`,
      html: htmlWrap("Good Morning — Studio Snapshot", `
        <h2 style="color:#1a0a2e;margin:0 0 4px;font-size:20px">Good morning! Here's today's snapshot.</h2>
        <p style="color:#aaa;font-size:13px;margin:0 0 24px">${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;margin:0 0 20px">
          <tr style="background:#f9f9f9">
            <td style="padding:10px 16px;color:#888;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Metric</td>
            <td style="padding:10px 16px;color:#888;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;text-align:right">Value</td>
          </tr>
          ${mkRow("Pending Orders",    pendingCount,                            pendingCount > 0 ? "#dc2626" : "#16a34a")}
          ${mkRow("Due Today",         dueToday,                                dueToday > 0    ? "#d97706" : "#16a34a")}
          ${mkRow("Overdue Tasks",     overdue,                                 overdue > 0     ? "#dc2626" : "#16a34a")}
          ${mkRow("Revenue This Week", `&#2547;${weekRevenue.toLocaleString()}`, "#2563eb")}
        </table>
        ${btn("Open Dashboard →", "https://tanvirstudio.com/dashboard")}
      `),
      text: `Morning Digest — Pending: ${pendingCount}, Due today: ${dueToday}, Overdue: ${overdue}, Revenue: ৳${weekRevenue}`,
    })).catch((e) => console.error("Morning digest email error:", e));

    console.log(`Morning digest sent. Pending:${pendingCount} DueToday:${dueToday} Overdue:${overdue}`);
  }
);

// ─── Weekly client progress email — Monday 10am Dhaka ─────────────────────────
exports.weeklyClientProgress = onSchedule(
  { schedule: "0 10 * * 1", timeZone: "Asia/Dhaka", secrets: [EMAIL_USER, EMAIL_PASS] },
  async () => {
    const snap = await db.collection("tasks")
      .where("status", "in", ["accepted", "in_progress"])
      .get().catch(() => ({ docs: [] }));

    // Group by clientEmail
    const byClient = {};
    snap.docs.forEach((d) => {
      const task = d.data();
      if (!task.clientEmail) return;
      if (!byClient[task.clientEmail]) byClient[task.clientEmail] = { name: task.client || "there", tasks: [] };
      byClient[task.clientEmail].tasks.push(task);
    });

    if (!Object.keys(byClient).length) return;

    const STATUS_LABEL = { accepted: "Accepted", in_progress: "In Progress", pending: "Pending Review" };
    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    let sent = 0;

    for (const [email, { name, tasks }] of Object.entries(byClient)) {
      const rows = tasks.map((t) => {
        const dl = getDeadlineMs(t);
        const dlStr = dl ? new Date(dl).toLocaleDateString("en-GB", { dateStyle: "medium" }) : "TBD";
        return `<tr>
          <td style="padding:10px 16px;color:#333;font-size:13px;border-top:1px solid #eee">${t.title || t.packageName || "Project"}</td>
          <td style="padding:10px 16px;font-size:13px;font-weight:600;text-align:center;border-top:1px solid #eee;color:#2563eb">${STATUS_LABEL[t.status] || t.status}</td>
          <td style="padding:10px 16px;font-size:13px;text-align:right;border-top:1px solid #eee;color:#555">${dlStr}</td>
        </tr>`;
      }).join("");

      try {
        await withRetry(() => transport.sendMail({
          from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
          to:      email,
          subject: `Your project update — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
          html: htmlWrap("Weekly Project Update", `
            <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">Here's your weekly update, ${name}! &#127925;</h2>
            ${para("Here's a quick snapshot of your active projects at Tanvir Studio:")}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;margin:0 0 20px">
              <tr style="background:#f9f9f9">
                <td style="padding:10px 16px;color:#888;font-size:11px;font-weight:700;text-transform:uppercase">Project</td>
                <td style="padding:10px 16px;color:#888;font-size:11px;font-weight:700;text-transform:uppercase;text-align:center">Status</td>
                <td style="padding:10px 16px;color:#888;font-size:11px;font-weight:700;text-transform:uppercase;text-align:right">Deadline</td>
              </tr>
              ${rows}
            </table>
            ${para("Check your dashboard for files, updates, and messages.")}
            ${btn("View Dashboard →", "https://tanvirstudio.com/dashboard")}
          `),
          text: `Hi ${name}, here's your weekly project update from Tanvir Studio. ${tasks.length} active project(s). View at tanvirstudio.com/dashboard`,
        }));
        sent++;
      } catch (e) { console.error("Weekly progress email error:", e); }
    }
    if (sent) console.log(`Sent ${sent} weekly client progress emails`);
  }
);
