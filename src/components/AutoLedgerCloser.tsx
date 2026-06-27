import { useEffect, useRef } from 'react';

import { setDoc, doc } from 'firebase/firestore';

import { db } from '../lib/firebase';

import { useData } from '../contexts/DataContext';

import { useAuth } from '../contexts/AuthContext';



export function AutoLedgerCloser() {

  const { transactions, monthlyLedgers } = useData();

  const { userData } = useAuth();

  const isProcessingRef = useRef(false);



  useEffect(() => {

    if (!userData || userData.role !== 'admin') return;

    if (!transactions || !monthlyLedgers) return;

    if (isProcessingRef.current) return;



    const processAutoClose = async () => {

      isProcessingRef.current = true;

      try {

        const now = new Date();

        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;



        const monthsWithTransactions = new Set<string>();

        transactions.forEach((tx: any) => {

          if (tx.status === 'Pending') return;

          const dateVal = tx.createdAt || tx.date;

          if (!dateVal) return;

          let date: Date;

          if (typeof dateVal === 'object' && typeof dateVal.toDate === 'function') {

            date = dateVal.toDate();

          } else {

            date = new Date(dateVal);

          }

          if (!isNaN(date.getTime())) {

            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            monthsWithTransactions.add(monthKey);

          }

        });



        const pastMonths = Array.from(monthsWithTransactions)

          .filter(monthKey => monthKey < currentMonthKey)

          .sort();



        const inMemoryClosingBalances: Record<string, number> = {};



        for (const monthKey of pastMonths) {

          const existingLedger = monthlyLedgers.find((l: any) => l.monthKey === monthKey);

          if (existingLedger) continue;



          const monthTxs = transactions.filter((tx: any) => {

            if (tx.status === 'Pending') return false;

            const dateVal = tx.createdAt || tx.date;

            if (!dateVal) return false;

            let date: Date;

            if (typeof dateVal === 'object' && typeof dateVal.toDate === 'function') {

              date = dateVal.toDate();

            } else {

              date = new Date(dateVal);

            }

            if (isNaN(date.getTime())) return false;

            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === monthKey;

          });



          const cashIn = monthTxs

            .filter((tx: any) => tx.type === 'in')

            .reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);

          const cashOut = monthTxs

            .filter((tx: any) => tx.type === 'out')

            .reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);



          const [y, m] = monthKey.split('-').map(Number);

          const prevDate = new Date(y, m - 2, 1);

          const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;



          let prevClosingBalance = 0;

          if (inMemoryClosingBalances[prevMonthKey] !== undefined) {

            prevClosingBalance = inMemoryClosingBalances[prevMonthKey];

          } else {

            const prevLedger = monthlyLedgers.find((l: any) => l.monthKey === prevMonthKey);

            if (prevLedger) prevClosingBalance = Number(prevLedger.closingBalance) || 0;

          }



          const openingBalance = prevClosingBalance;

          const closingBalance = openingBalance + cashIn - cashOut;

          inMemoryClosingBalances[monthKey] = closingBalance;



          try {

            await setDoc(doc(db, 'monthlyLedgers', monthKey), {

              monthKey,

              openingBalance,

              cashIn,

              cashOut,

              closingBalance,

              isClosed: true,

              autoClosed: true,

              closedAt: new Date().toISOString(),

              closedBy: 'System Auto-Closer',

            });

          } catch {

            // Silent — will retry on next data change

          }

        }

      } finally {

        isProcessingRef.current = false;

      }

    };



    processAutoClose();

  }, [userData, transactions, monthlyLedgers]);



  return null;

}

