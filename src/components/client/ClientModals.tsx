import React from 'react';
import { ClientProfileModal } from './ClientProfileModal';
import { ClientCreateModal, type NewClientForm } from './ClientCreateModal';
import { ClientEditModal } from './ClientEditModal';
import { ClientPaymentModal } from './ClientPaymentModal';
import type { Client, Task, Transaction, Communication } from '../../types';

// Barrel: renders all client-related modals for ClientManager.tsx.
// Kept as a single component so the call site doesn't need to change —
// see ClientProfileModal / ClientCreateModal / ClientEditModal / ClientPaymentModal
// for the actual (typed) implementations.
interface ClientModalsProps {
  // Profile modal
  isProfileOpen: boolean;
  setIsProfileOpen: (v: boolean) => void;
  selectedClient: Client | null;
  isMobile: boolean;
  isAdmin: boolean;
  currency: string;
  clientFinancials: Map<string, { spent: number; due: number }>;
  clientProjects: Task[];
  showAllProjects: boolean;
  setShowAllProjects: React.Dispatch<React.SetStateAction<boolean>>;
  clientPayments: Transaction[];
  comms: Communication[];
  markFollowUpDone: (logId: string) => void;
  showFollowUpForm: boolean;
  setShowFollowUpForm: React.Dispatch<React.SetStateAction<boolean>>;
  followUpDate: string;
  setFollowUpDate: (v: string) => void;
  followUpNote: string;
  setFollowUpNote: (v: string) => void;
  handleSaveFollowUp: (e: React.FormEvent) => void;
  handleShareStatus: () => void;
  setIsClientInvoiceOpen: (v: boolean) => void;
  setIsBonus: React.Dispatch<React.SetStateAction<boolean>>;
  setPaymentAmount: React.Dispatch<React.SetStateAction<string>>;
  setPaymentNote: React.Dispatch<React.SetStateAction<string>>;
  setIsPaymentModalOpen: (v: boolean) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  handleDeleteClient: (id: string) => void;
  handleAddLog: (e: React.FormEvent) => void;
  newComm: { type: string; content: string };
  setNewComm: React.Dispatch<React.SetStateAction<{ type: string; content: string }>>;
  isSubmittingLog: boolean;
  // Create modal
  isModalOpen: boolean;
  setIsModalOpen: (v: boolean) => void;
  handleAddClient: (e: React.FormEvent) => void;
  newClient: NewClientForm;
  setNewClient: React.Dispatch<React.SetStateAction<NewClientForm>>;
  // Edit modal
  isEditModalOpen: boolean;
  setIsEditModalOpen: (v: boolean) => void;
  isSaving: boolean;
  handleEditClient: (e: React.FormEvent) => void;
  editClientData: Client | null;
  setEditClientData: React.Dispatch<React.SetStateAction<Client | null>>;
  // Payment modal
  isPaymentModalOpen: boolean;
  isBonus: boolean;
  paymentAmount: string;
  paymentNote: string;
  handleReceivePayment: (e: React.FormEvent) => void;
}

export function ClientModals(props: ClientModalsProps) {
  const {
    isProfileOpen, setIsProfileOpen, selectedClient,
    isMobile, isAdmin, currency, clientFinancials,
    clientProjects, showAllProjects, setShowAllProjects,
    clientPayments, comms, markFollowUpDone,
    showFollowUpForm, setShowFollowUpForm,
    followUpDate, setFollowUpDate, followUpNote, setFollowUpNote,
    handleSaveFollowUp, handleShareStatus, setIsClientInvoiceOpen,
    setIsBonus, setPaymentAmount, setPaymentNote, setIsPaymentModalOpen,
    confirmDeleteId, setConfirmDeleteId, handleDeleteClient,
    handleAddLog, newComm, setNewComm, isSubmittingLog,
    isModalOpen, setIsModalOpen, handleAddClient, newClient, setNewClient,
    isEditModalOpen, setIsEditModalOpen, isSaving, handleEditClient,
    editClientData, setEditClientData,
    isPaymentModalOpen, isBonus, paymentAmount, paymentNote,
    handleReceivePayment,
  } = props;

  return (
    <>
      <ClientProfileModal
        isProfileOpen={isProfileOpen} setIsProfileOpen={setIsProfileOpen} selectedClient={selectedClient}
        isMobile={isMobile} isAdmin={isAdmin} currency={currency} clientFinancials={clientFinancials}
        clientProjects={clientProjects} showAllProjects={showAllProjects} setShowAllProjects={setShowAllProjects}
        clientPayments={clientPayments} comms={comms} markFollowUpDone={markFollowUpDone}
        showFollowUpForm={showFollowUpForm} setShowFollowUpForm={setShowFollowUpForm}
        followUpDate={followUpDate} setFollowUpDate={setFollowUpDate} followUpNote={followUpNote} setFollowUpNote={setFollowUpNote}
        handleSaveFollowUp={handleSaveFollowUp} handleShareStatus={handleShareStatus} setIsClientInvoiceOpen={setIsClientInvoiceOpen}
        setIsBonus={setIsBonus} setPaymentAmount={setPaymentAmount} setPaymentNote={setPaymentNote} setIsPaymentModalOpen={setIsPaymentModalOpen}
        confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} handleDeleteClient={handleDeleteClient}
        handleAddLog={handleAddLog} newComm={newComm} setNewComm={setNewComm} isSubmittingLog={isSubmittingLog}
      />

      <ClientCreateModal
        isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} handleAddClient={handleAddClient} newClient={newClient} setNewClient={setNewClient}
      />

      <ClientEditModal
        isEditModalOpen={isEditModalOpen} setIsEditModalOpen={setIsEditModalOpen} isSaving={isSaving} handleEditClient={handleEditClient}
        editClientData={editClientData} setEditClientData={setEditClientData}
      />

      <ClientPaymentModal
        isPaymentModalOpen={isPaymentModalOpen} setIsPaymentModalOpen={setIsPaymentModalOpen} isBonus={isBonus} setIsBonus={setIsBonus}
        paymentAmount={paymentAmount} setPaymentAmount={setPaymentAmount} paymentNote={paymentNote} setPaymentNote={setPaymentNote}
        handleReceivePayment={handleReceivePayment} currency={currency} selectedClient={selectedClient}
        clientFinancials={clientFinancials} isSaving={isSaving}
      />
    </>
  );
}
