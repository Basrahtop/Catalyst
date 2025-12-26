"use client";
import React from 'react';
import { X } from 'lucide-react';

// 1. Define the "props" this component needs
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode; // 'children' will be the form we put inside it
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // 2. If the modal isn't 'isOpen', it renders nothing
  if (!isOpen) {
    return null;
  }

  // 3. This is the "vibrant" modal layout
  return (
    // A) The semi-transparent backdrop
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose} // Click outside to close
    >
      {/* B) The main modal "card" */}
      <div 
        className="relative w-full max-w-lg p-6 bg-white rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()} // Stop click from closing modal
      >
        {/* C) The Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* D) The Content */}
        {/* This is where our 'AddProductForm' will go */}
        <div className="mt-4">
          {children}
        </div>
      </div>
    </div>
  );
}