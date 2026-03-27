import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, DollarSign, Package, CreditCard, Banknote, Smartphone, ScanLine, Receipt, Maximize, Minimize, QrCode, ArrowRight, ArrowLeft } from 'lucide-react';

// API Configuration
const API_BASE = 'http://localhost:3000/api';

const POSCartUI = ({ onNavigateToLogin, onViewHistory }) => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showABAModal, setShowABAModal] = useState(false);
  const [visaDetails, setVisaDetails] = useState({
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCVC: ''
  });

  // Fetch cart on mount and set up polling
  useEffect(() => {
    fetchCart();
    const interval = setInterval(fetchCart, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchCart = async () => {
    try {
      const response = await fetch(`${API_BASE}/cart`);
      const data = await response.json();
      setCart(data);
    } catch (error) {
      console.error('Failed to fetch cart', error);
    }
  };

  const clearCart = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/cart/clear`, { method: 'DELETE' });

      if (response.ok) {
        setCart({ items: [], total: 0 });
        showMessage('Cart cleared', 'success');
      } else {
        showMessage('Failed to clear cart', 'error');
      }
    } catch {
      showMessage('Failed to clear cart', 'error');
    }
    setLoading(false);
  };

  const updateQuantity = async (id, action) => {
    try {
      const response = await fetch(`${API_BASE}/cart/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, action }),
      });

      if (response.ok) {
        fetchCart();
      } else {
        console.error('Failed to update quantity');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/products/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: manualBarcode, addToCart: true }),
      });

      const data = await response.json();

      if (response.ok) {
        setManualBarcode(''); // Clear input
        fetchCart(); // Refresh cart
        showMessage(`Added ${data.name}`, 'success');
      } else {
        showMessage(data.message || 'Product not found', 'error');
      }
    } catch (error) {
      showMessage('Error adding product', 'error');
    }
    setLoading(false);
  };

  const handleVisaChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cardNumber') {
      const digits = value.replace(/\D/g, '').slice(0, 16);
      formattedValue = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    } else if (name === 'cardExpiry') {
      const digits = value.replace(/\D/g, '').slice(0, 4);
      if (digits.length >= 2) {
        formattedValue = `${digits.slice(0, 2)}/${digits.slice(2)}`;
      } else {
        formattedValue = digits;
      }
    } else if (name === 'cardCVC') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4);
    } else if (name === 'cardName') {
      formattedValue = value.toUpperCase();
    }

    setVisaDetails(prev => ({ ...prev, [name]: formattedValue }));
  };

  const resetVisaForm = () => {
    setVisaDetails({
      cardNumber: '',
      cardName: '',
      cardExpiry: '',
      cardCVC: ''
    });
  };

  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      showMessage('Cart is empty', 'error');
      return;
    }

    try {
      showMessage(`Processing payment of $${calculateGrandTotal()}...`, 'success');

      const response = await fetch(`${API_BASE}/receipt`);

      if (response.ok) {
        // Record sale to database
        try {
          await fetch(`${API_BASE}/sales/record`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentMethod })
          });
        } catch (saleErr) {
          console.error("Failed to record sale:", saleErr);
          // Don't block the receipt if recording the sale fail, but log it
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setReceiptUrl(url);
        setShowReceipt(true);
        showMessage('Payment successful!', 'success');
      } else {
        throw new Error('Failed to generate receipt');
      }

    } catch (error) {
      console.error("Checkout failed", error);
      showMessage('Checkout failed', 'error');
    }
    setLoading(false);
  };

  const handleDownloadReceipt = () => {
    if (receiptUrl) {
      const a = document.createElement('a');
      a.href = receiptUrl;
      a.download = `receipt-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleNewOrder = () => {
    setShowReceipt(false);
    setReceiptUrl(null);
    clearCart();
    if (paymentMethod === 'visa') {
      resetVisaForm();
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  const calculateTax = () => (cart.total * 0.08).toFixed(2);
  const calculateGrandTotal = () => (cart.total + parseFloat(calculateTax())).toFixed(2);

  return (
    <div className="h-screen w-full bg-[#050505] overflow-hidden flex animate-page-enter text-white font-sans">

      {/* LEFT SECTION: MAIN POS AREA (66% Width) */}
      <div className="flex-1 flex flex-col h-full bg-[#090909]">

        {/* Navbar */}
        <header className="px-8 py-5 flex items-center justify-between border-b border-[#222] bg-[#050505] z-10">
          <div className="flex items-center gap-4">
            <img src="/prism_logo.png" alt="PRISM" className="h-10 w-auto" />
            <div>
              <h1 className="text-xl font-black text-white tracking-widest uppercase">PRISM</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <p className="text-xs font-bold text-[#666] uppercase tracking-widest">ONLINE • STATION A</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleFullScreen}
              className="p-2.5 text-[#666] hover:text-white hover:bg-[#222] rounded-lg transition-colors"
            >
              {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            <button
              onClick={onViewHistory}
              className="flex items-center gap-2 border border-[#333] hover:border-[#ff007f] text-[#666] hover:text-white px-5 py-2.5 rounded-full font-bold transition-all text-xs tracking-widest uppercase"
            >
              <Receipt className="w-4 h-4" /> HISTORY
            </button>
            <button
              onClick={onNavigateToLogin}
              className="flex items-center gap-2 border border-[#333] hover:border-[#ff007f] text-white px-5 py-2.5 rounded-full font-bold transition-all hover:shadow-[0_0_15px_rgba(255,0,127,0.3)] text-xs tracking-widest uppercase"
            >
              <Plus className="w-4 h-4" /> ADD ITEM
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col p-8 relative">

          {/* Scan Bar */}
          <div className="mb-6">
            <form onSubmit={handleManualAdd} className="flex gap-4">
              <div className="flex-1 relative group">
                <ScanLine className="absolute left-5 top-1/2 -translate-y-1/2 text-[#444] group-focus-within:text-[#ff007f] transition-colors w-5 h-5" />
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="SCAN BARCODE..."
                  className="w-full bg-[#121212] border border-[#333] text-white pl-14 pr-6 py-4 rounded-sm shadow-none focus:outline-none focus:border-[#ff007f] font-mono text-lg transition-all tracking-wider placeholder-[#444]"
                />
              </div>
              <button
                type="submit"
                disabled={!manualBarcode.trim()}
                className="bg-[#121212] border border-[#333] hover:bg-[#ff007f] hover:border-[#ff007f] hover:text-white text-[#888] px-8 rounded-sm font-bold transition-all disabled:opacity-30 uppercase tracking-widest"
              >
                ENTER
              </button>
            </form>
          </div>

          {/* Product List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {cart.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <ShoppingCart className="w-20 h-20 text-[#333] mb-6" />
                <h2 className="text-2xl font-black text-[#555] uppercase tracking-widest">NO ITEMS</h2>
                <p className="text-[#444] mt-2 font-mono text-sm">SCAN TO INITIATE</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {cart.items.map((item, index) => (
                  <div key={index} className="flex items-center p-4 bg-[#121212] border border-[#222] rounded-sm hover:border-[#ff007f] transition-all group">
                    {/* Icon/Image */}
                    <div className="w-14 h-14 bg-[#050505] flex items-center justify-center border border-[#222] mr-5 overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-[#444] group-hover:text-[#ff007f] transition-colors" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg tracking-wide uppercase">{item.name}</h3>
                      <div className="text-xs font-bold text-[#555] flex items-center gap-3 mt-1">
                        <span className="font-mono text-[#777]">{item.barcode}</span>
                        <span className="w-1 h-1 bg-[#333] rounded-full"></span>
                        <span className="text-[#ff007f]">${item.price.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQuantity(item.id, 'decrement')} className="p-2 hover:bg-[#222] rounded-sm transition-all text-[#666] hover:text-white border border-transparent hover:border-[#333]">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center font-bold text-white font-mono text-lg">{item.qty}</span>
                        <button onClick={() => updateQuantity(item.id, 'increment')} className="p-2 hover:bg-[#222] rounded-sm transition-all text-[#666] hover:text-[#ff007f] border border-transparent hover:border-[#333]">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="w-24 text-right font-black text-xl text-white tracking-tight">
                        ${(item.price * item.qty).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Bar: Quick Actions */}
          <div className="mt-6 flex justify-between items-center bg-[#121212] p-4 border border-[#222]">
            <div className="text-xs font-bold text-[#555] uppercase tracking-widest">
              USER: <span className="text-white">ADMINISTRATOR</span>
            </div>
            <button
              onClick={clearCart}
              disabled={cart.items.length === 0}
              className="flex items-center gap-2 text-[#444] hover:text-[#ff0044] px-4 py-2 font-bold transition-colors disabled:opacity-30 uppercase text-xs tracking-widest"
            >
              <Trash2 className="w-4 h-4" /> CLEAr
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: PURPLE PAYMENT PANEL (33% Width) */}
      <div className="w-[420px] bg-[#4a148c] h-full text-white flex flex-col shadow-2xl z-20 relative overflow-hidden">
        {/* Decorative Gradient */}
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-transparent to-black opacity-40 pointer-events-none"></div>

        {/* Header */}
        <div className="p-8 border-b border-[#ffffff10] relative z-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black uppercase tracking-widest text-[#ff007f]">Summary</h2>
            <span className="bg-[#00000030] border border-[#ffffff20] px-3 py-1 rounded-sm text-xs font-mono text-[#aaa]">#2039</span>
          </div>
          <p className="text-[#ffffff60] text-xs font-bold tracking-widest uppercase">{new Date().toLocaleDateString()}</p>
        </div>

        {/* Summary Area */}
        <div className="p-8 flex-1 relative z-10">
          <div className="space-y-4">
            <div className="flex justify-between text-[#ffffff80] text-sm font-bold uppercase tracking-wider">
              <span>Subtotal</span>
              <span className="font-mono text-white">${cart.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#ffffff80] text-sm font-bold uppercase tracking-wider">
              <span>Tax (8%)</span>
              <span className="font-mono text-white">${calculateTax()}</span>
            </div>
          </div>

          <div className="my-8 h-px bg-[#ffffff10]"></div>

          <div className="flex justify-between items-baseline mb-12">
            <span className="text-xl font-bold text-[#ffffff80] uppercase tracking-widest">Total</span>
            <span className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              ${calculateGrandTotal()}
            </span>
          </div>

          <div className="space-y-6">
            <h3 className="text-[#ffffff50] text-xs font-black uppercase tracking-[0.2em] mb-4">Payment Method</h3>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'cash', icon: Banknote, label: 'Cash' },
                { id: 'visa', icon: CreditCard, label: 'Visa' },
                { id: 'aba', icon: QrCode, label: 'ABA' },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-sm border-2 transition-all ${paymentMethod === method.id
                    ? 'bg-[#ff007f] border-[#ff007f] text-white shadow-[0_0_15px_rgba(255,0,127,0.4)]'
                    : 'bg-transparent border-[#ffffff20] text-[#ffffff50] hover:border-white hover:text-white'
                    }`}
                >
                  <method.icon className="w-6 h-6" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{method.label}</span>
                </button>
              ))}
            </div>

            {/* Dynamic Payment Input Areas */}
            <div className="mt-8 bg-[#00000030] p-6 rounded-sm border border-[#ffffff10] min-h-[160px] flex flex-col justify-center">
              {paymentMethod === 'aba' && (
                <div className="flex flex-col items-center animate-page-enter w-full">
                  <button
                    onClick={() => setShowABAModal(true)}
                    className="bg-[#222] hover:bg-[#ff007f] hover:text-white text-[#888] px-6 py-8 rounded-sm font-bold transition-all uppercase tracking-widest border border-[#333] hover:border-[#ff007f] flex flex-col items-center gap-3 group w-full shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(255,0,127,0.4)]"
                  >
                    <QrCode className="w-10 h-10 group-hover:scale-110 transition-transform" />
                    <span>Show QR Code</span>
                  </button>
                  <p className="text-[#666] mt-4 text-[10px] font-bold uppercase tracking-widest text-center">
                    Scan via Mobile Banking
                  </p>
                </div>
              )}

              {paymentMethod === 'visa' && (
                <div className="space-y-4 animate-page-enter">
                  <input
                    name="cardNumber"
                    value={visaDetails.cardNumber}
                    onChange={handleVisaChange}
                    placeholder="CARD NUMBER"
                    className="w-full bg-[#00000050] border-b border-[#ffffff30] p-2 text-white font-mono placeholder:text-[#ffffff30] focus:outline-none focus:border-[#ff007f] transition-colors text-sm"
                  />
                  <div className="flex gap-4">
                    <input
                      name="cardExpiry"
                      value={visaDetails.cardExpiry}
                      onChange={handleVisaChange}
                      placeholder="MM/YY"
                      className="w-full bg-[#00000050] border-b border-[#ffffff30] p-2 text-white font-mono placeholder:text-[#ffffff30] focus:outline-none focus:border-[#ff007f] transition-colors text-sm"
                    />
                    <input
                      name="cardCVC"
                      value={visaDetails.cardCVC}
                      onChange={handleVisaChange}
                      placeholder="CVC"
                      className="w-full bg-[#00000050] border-b border-[#ffffff30] p-2 text-white font-mono placeholder:text-[#ffffff30] focus:outline-none focus:border-[#ff007f] transition-colors text-sm"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'cash' && (
                <div className="text-center animate-page-enter">
                  <p className="text-[#aaa] mb-2 text-xs font-bold uppercase tracking-widest">Collect Cash</p>
                  <div className="text-3xl font-bold text-[#00ff00] drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]">${calculateGrandTotal()}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Pay Button */}
        <div className="p-8 border-t border-[#ffffff10] bg-[#00000020] relative z-10">
          <button
            onClick={handleCheckout}
            disabled={cart.items.length === 0 || loading}
            className="w-full bg-white hover:bg-[#ff007f] hover:text-white text-black py-5 rounded-full font-black text-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50 uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,0,127,0.4)]"
          >
            <span>PAY NOW</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>

      {/* Floating Status Toast */}
      {message.text && (
        <div className={`fixed bottom-10 left-10 px-6 py-4 rounded-sm shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center gap-3 animate-page-enter z-50 border ${message.type === 'success' ? 'bg-[#121212] border-green-500 text-green-500' : 'bg-[#121212] border-red-500 text-red-500'
          }`}>
          <span className="font-bold uppercase tracking-widest text-sm">{message.text}</span>
        </div>
      )}

      {/* ABA QR Modal */}
      {showABAModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-page-enter">
          <div className="bg-[#121212] rounded-sm overflow-hidden w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-[#333] relative">
            <button
              onClick={() => setShowABAModal(false)}
              className="absolute top-4 right-4 text-white hover:text-[#ff007f] transition-colors bg-black/50 p-2 rounded-full"
            >
              <Minimize className="w-6 h-6 rotate-45" />
            </button>

            <div className="p-8 flex flex-col items-center justify-center text-center">
              <h3 className="font-black text-2xl text-[#ff007f] uppercase tracking-widest mb-2">Scan to Pay</h3>
              <p className="text-[#666] text-xs font-bold uppercase tracking-widest mb-8">Use your mobile banking app</p>

              <div className="bg-white p-4 rounded-sm mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                <img src="/aba_qr.png" alt="ABA QR Code" className="w-64 h-64 object-contain" />
              </div>

              <div className="flex items-center gap-2 text-[#444] text-xs font-bold uppercase tracking-widest">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Waiting for payment...
              </div>
            </div>

            <div className="p-4 border-t border-[#222] bg-[#050505]">
              <button
                onClick={() => setShowABAModal(false)}
                className="w-full py-3 bg-[#333] hover:bg-[#444] text-white font-bold rounded-sm uppercase tracking-widest text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Receipt Modal */}
      {showReceipt && receiptUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-page-enter">
          <div className="bg-[#121212] rounded-sm overflow-hidden w-full max-w-6xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col h-[95vh] border border-[#333]">
            <div className="flex justify-between items-center p-6 border-b border-[#222]">
              <h3 className="font-black text-xl text-white uppercase tracking-widest">Receipt</h3>
              <button onClick={handleNewOrder} className="p-2 hover:bg-[#222] rounded-full text-white"><Minimize className="w-6 h-6 rotate-45" /></button>
            </div>
            <div className="flex-1 bg-[#050505] p-0 overflow-hidden">
              <iframe src={`${receiptUrl}#view=FitV`} className="w-full h-full border-none" title="Receipt"></iframe>
            </div>
            <div className="p-6 border-t border-[#222] flex gap-4">
              <button onClick={handleNewOrder} className="flex-1 py-3 font-bold text-[#888] hover:text-white hover:bg-[#222] rounded-sm uppercase tracking-widest text-xs border border-[#333]">New Order</button>
              <button onClick={handleDownloadReceipt} className="flex-1 py-3 bg-[#ff007f] text-white font-bold rounded-sm hover:bg-[#d5006d] uppercase tracking-widest text-xs shadow-[0_0_15px_rgba(255,0,127,0.3)]">Download</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default POSCartUI;