"use client";
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';
import { 
  Loader2, ShoppingCart, Star, Heart, Tag, ChevronRight, 
  Shirt, Smartphone, Carrot, Home, Sparkles, Car, LayoutGrid 
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link'; // <-- 1. Import Link

// --- 1. Interfaces ---
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  sme: {
    businessName: string;
  };
}

// --- 2. Constants ---
const CATEGORIES = [
  { name: "All", icon: Sparkles },
  { name: "Fashion", icon: Shirt },
  { name: "Automobiles", icon: Car },
  { name: "Agriculture", icon: Carrot },
  { name: "Tech & Gadgets", icon: Smartphone },
  { name: "Home & Living", icon: Home },
  { name: "Others", icon: LayoutGrid },
];

// Helper for Naira
const formatNaira = (amount: number) => 
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount / 100);

export default function MarketplaceHome() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const { addToCart } = useCart();

  // --- 3. Fetch & Initialize ---
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await api.get<Product[]>('/products');
        setProducts(response.data);
        setFilteredProducts(response.data);
      } catch (error) {
        console.error("Failed to load products", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // --- 4. Client-Side Category Filter ---
  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    if (category === "All") {
      setFilteredProducts(products);
    } else {
      const lowerCat = category.toLowerCase().slice(0, 4); 
      const filtered = products.filter(p => 
        p.description.toLowerCase().includes(lowerCat) || 
        p.name.toLowerCase().includes(lowerCat)
      );
      setFilteredProducts(filtered.length > 0 ? filtered : products);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Navbar />
      
      {/* --- HERO SECTION --- */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-8 md:mb-0 md:w-1/2 z-10">
              <span className="inline-block py-1 px-3 rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold mb-4 uppercase tracking-wider shadow-md">
                Catalyst Exclusive
              </span>
              
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4 drop-shadow-xl hover:scale-105 transition-transform duration-500 cursor-default origin-left">
                Empower Local.<br/> 
                <span className="text-blue-200">Shop Global.</span>
              </h1>

              <p className="text-lg text-indigo-100 mb-8 max-w-md drop-shadow-md">
                Discover high-quality products from verified SMEs. Every purchase boosts the local economy.
              </p>
              <button className="bg-white text-indigo-900 px-8 py-3 rounded-full font-bold hover:bg-yellow-400 hover:text-yellow-900 transition-all shadow-lg hover:shadow-xl flex items-center transform hover:-translate-y-1">
                Start Shopping <ChevronRight className="ml-2 w-5 h-5" />
              </button>
            </div>
            
            <div className="md:w-1/2 flex justify-center relative">
               <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -top-10 -right-10 animate-pulse"></div>
               <img 
                 src="https://placehold.co/600x400/transparent/ffffff?text=Featured+Products" 
                 alt="Hero"
                 className="relative z-10 rounded-xl shadow-2xl transform rotate-3 hover:rotate-1 transition-transform duration-700 border-4 border-white/10"
               />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        
        {/* --- CATEGORY TABS --- */}
        <div className="bg-white rounded-xl shadow-lg p-2 mb-8 flex overflow-x-auto no-scrollbar space-x-2 border border-gray-100">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => handleCategoryClick(cat.name)}
              className={`flex items-center px-6 py-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.name 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
              }`}
            >
              <cat.icon className={`w-4 h-4 mr-2 ${activeCategory === cat.name ? 'text-white' : 'text-gray-400'}`} />
              {cat.name}
            </button>
          ))}
        </div>

        {/* --- PRODUCT GRID --- */}
        {isLoading ? (
          <div className="flex justify-center py-40">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 pb-20">
            {filteredProducts.map((product) => (
              <div key={product.id} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col relative">
                
                {/* Floating Action Buttons */}
                <div className="absolute top-3 right-3 z-10 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button className="p-2 bg-white rounded-full shadow-md hover:text-red-500 transition-colors">
                    <Heart className="w-4 h-4" />
                  </button>
                </div>

                {/* Discount Badge */}
                <div className="absolute top-3 left-3 z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center">
                  <Tag className="w-3 h-3 mr-1" /> -15%
                </div>

                {/* --- 2. LINKED IMAGE --- */}
                <Link href={`/product/${product.id}`} className="block h-48 md:h-64 overflow-hidden bg-gray-100 relative cursor-pointer">
                   <img 
                    src={product.imageUrl || 'https://placehold.co/400x400/e2e8f0/94a3b8?text=Product'} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </Link>

                {/* Content */}
                <div className="p-4 flex flex-col flex-grow">
                  <div className="mb-1 text-xs text-gray-500 flex items-center">
                    <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium mr-2">Official Store</span>
                    {product.sme.businessName}
                  </div>
                  
                  {/* --- 3. LINKED TITLE --- */}
                  <Link href={`/product/${product.id}`} className="block mb-2">
                    <h3 className="text-sm md:text-base font-bold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  
                  {/* Price Section */}
                  <div className="mt-auto">
                    <div className="flex items-baseline space-x-2">
                      <p className="text-lg md:text-xl font-extrabold text-gray-900">
                        {formatNaira(product.price)}
                      </p>
                      <p className="text-xs text-gray-400 line-through">
                        {formatNaira(product.price * 1.15)}
                      </p>
                    </div>
                    
                    <div className="flex items-center mt-1 mb-3">
                      <div className="flex text-yellow-400 text-xs">
                        {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-current" />)}
                      </div>
                      <span className="text-xs text-gray-400 ml-1">(128)</span>
                    </div>

                    {/* Add to Cart Button (NOT LINKED) */}
                    <button 
                      onClick={(e) => {
                        e.preventDefault(); // Stop link click if any
                        addToCart({
                          productId: product.id,
                          name: product.name,
                          price: product.price,
                          imageUrl: product.imageUrl,
                          smeId: product.sme.businessName,
                          quantity: 1
                        });
                      }}
                      className="w-full py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl 
                                 hover:bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg group-hover:shadow-indigo-200"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-40 bg-white rounded-3xl shadow-sm border border-gray-100">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <ShoppingCart className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No products found</h3>
            <p className="text-gray-500 mt-2">Try adjusting your category or search terms.</p>
            <button 
              onClick={() => setActiveCategory("All")}
              className="mt-6 text-indigo-600 font-semibold hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}