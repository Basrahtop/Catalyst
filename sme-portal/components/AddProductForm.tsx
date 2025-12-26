"use client";
import React, { useState } from 'react';
import api from '../lib/api';
import { Loader2, UploadCloud, Tag, Box, List } from 'lucide-react';

interface AddProductFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Matches our Marketplace Categories
const CATEGORIES = [
  "General",
  "Fashion",
  "Automobiles",
  "Agriculture",
  "Tech & Gadgets",
  "Home & Living",
  "Others"
];

export default function AddProductForm({ onClose, onSuccess }: AddProductFormProps) {
  // --- Form State ---
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // --- NEW V4 FIELDS ---
  const [category, setCategory] = useState('General');
  const [stock, setStock] = useState('1');
  const [featuresText, setFeaturesText] = useState(''); // We'll split this by newlines
  
  // --- File Upload State ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('No file chosen');
  
  // --- UI State ---
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- File Handler ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);
      setImageUrl(''); // Clear manual URL
    }
  };

  // --- Submit Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    let finalImageUrl = imageUrl;

    try {
      // 1. Upload Image if selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append('image', selectedFile);
        const uploadResponse = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        finalImageUrl = uploadResponse.data.imageUrl;
      }
      
      // 2. Process "Rich Data"
      // Split features by new line to create an array
      const featuresArray = featuresText.split('\n').filter(line => line.trim() !== '');

      const productData = {
        name,
        description,
        price: parseFloat(price),
        imageUrl: finalImageUrl,
        // --- V4 Mapping ---
        category,
        stock: parseInt(stock),
        features: featuresArray,
        galleryImages: finalImageUrl ? [finalImageUrl] : [], // Start gallery with main image
        specifications: {}, // Empty JSON for now (can add advanced builder later)
      };

      // 3. Send to API
      await api.post('/products', productData);
      
      setIsSubmitting(false);
      onSuccess(); 
      onClose();   
      
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(err.response.data.error);
      } else {
        setError('An unknown error occurred.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      
      {/* Row 1: Name & Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Product Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g. Men's Agbada"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <div className="relative mt-1">
            <Tag className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Row 2: Price & Stock */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Price (₦)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="25000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
          <div className="relative mt-1">
            <Box className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
              min="0"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>
      
      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Describe your product..."
        />
      </div>

      {/* Features (Bullet Points) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 flex items-center">
          <List className="w-4 h-4 mr-1" /> Key Features (One per line)
        </label>
        <textarea
          rows={3}
          value={featuresText}
          onChange={(e) => setFeaturesText(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          placeholder="e.g.&#10;100% Cotton&#10;Machine Washable&#10;Available in 3 sizes"
        />
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Product Image</label>
        <div className="mt-1 flex items-center space-x-3">
          <label 
            htmlFor="file-upload" 
            className="cursor-pointer px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center"
          >
            <UploadCloud className="w-5 h-5 mr-2 text-gray-500" />
            Choose File
          </label>
          <input 
            id="file-upload" 
            type="file" 
            className="sr-only" 
            accept="image/*"
            onChange={handleFileChange}
          />
          <span className="text-sm text-gray-500 truncate">{fileName}</span>
        </div>
        
        {/* URL Fallback */}
        <div className="mt-2">
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              setSelectedFile(null);
              setFileName('No file chosen');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Or paste image URL..."
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center font-medium">{error}</p>
      )}

      <div className="flex justify-end space-x-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-36 flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Product'}
        </button>
      </div>
    </form>
  );
}