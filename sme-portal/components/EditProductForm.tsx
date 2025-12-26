"use client";
import React, { useState } from 'react';
import api from '../lib/api'; 
import { Loader2, UploadCloud, Tag, Box, List } from 'lucide-react';

// --- Interfaces ---
interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // in Kobo
  imageUrl: string;
  // V4 Fields
  category?: string;
  stock?: number;
  features?: string[];
}

interface EditProductFormProps {
  product: Product; 
  onClose: () => void;
  onSuccess: () => void; 
}

const CATEGORIES = [
  "General",
  "Fashion",
  "Automobiles",
  "Agriculture",
  "Tech & Gadgets",
  "Home & Living",
  "Others"
];

export default function EditProductForm({ product, onClose, onSuccess }: EditProductFormProps) {
  // --- Form State (Pre-filled) ---
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState((product.price / 100).toString()); // Kobo to Naira
  const [imageUrl, setImageUrl] = useState(product.imageUrl);
  
  // --- V4 Fields State ---
  const [category, setCategory] = useState(product.category || 'General');
  const [stock, setStock] = useState(product.stock?.toString() || '1');
  // Convert array back to text (one per line) for editing
  const [featuresText, setFeaturesText] = useState(product.features ? product.features.join('\n') : '');

  // --- File Upload State ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('Change image? (Optional)');
  
  // --- UI State ---
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- File Handler ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);
      setImageUrl(''); // Clear manual URL if file picked
    }
  };

  // --- Submit Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    let finalImageUrl = product.imageUrl; // Start with original

    try {
      // 1. Handle Image Upload (if new file selected)
      if (selectedFile) {
        const formData = new FormData();
        formData.append('image', selectedFile);
        const uploadResponse = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        finalImageUrl = uploadResponse.data.imageUrl;
      
      } else if (imageUrl !== product.imageUrl) {
        // User manually changed the URL text
        finalImageUrl = imageUrl;
      }
      
      // 2. Process Features (Text -> Array)
      const featuresArray = featuresText.split('\n').filter(line => line.trim() !== '');

      // 3. Build Payload
      const updatedData = {
        name,
        description,
        price: parseFloat(price),
        imageUrl: finalImageUrl,
        // V4 Data
        category,
        stock: parseInt(stock),
        features: featuresArray,
      };

      // 4. Send PATCH
      await api.patch(`/products/${product.id}`, updatedData);
      
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
        />
      </div>

      {/* Features */}
      <div>
        <label className="block text-sm font-medium text-gray-700 flex items-center">
          <List className="w-4 h-4 mr-1" /> Key Features (One per line)
        </label>
        <textarea
          rows={3}
          value={featuresText}
          onChange={(e) => setFeaturesText(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          placeholder="e.g.&#10;100% Cotton&#10;Machine Washable"
        />
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Product Image</label>
        
        {/* Preview */}
        <div className="mt-2 mb-3">
          <img 
            src={selectedFile ? URL.createObjectURL(selectedFile) : imageUrl || 'https://placehold.co/600x400/e2e8f0/94a3b8?text=No+Image'}
            alt="Preview"
            className="w-full h-40 object-cover rounded-lg border border-gray-200"
          />
        </div>

        <div className="flex items-center space-x-3">
          <label 
            htmlFor="edit-file-upload" 
            className="cursor-pointer px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center"
          >
            <UploadCloud className="w-5 h-5 mr-2 text-gray-500" />
            Choose New Image
          </label>
          <input 
            id="edit-file-upload" 
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
              setFileName('Change image? (Optional)');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Or paste new image URL..."
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center font-medium">{error}</p>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
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
          className="w-32 flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}