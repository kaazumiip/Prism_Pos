import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Clock, DollarSign, Package, Calendar, TrendingUp, ShoppingBag } from 'lucide-react';

const API_BASE = 'http://localhost:3000/api';

const History = ({ onBack, backLabel = "Back to Dashboard" }) => {
    const [sales, setSales] = useState([]);
    const [stats, setStats] = useState({
        total_revenue: 0,
        today_revenue: 0,
        weekly_revenue: 0,
        monthly_revenue: 0,
        yearly_revenue: 0,
        total_orders: 0,
        today_orders: 0,
        weekly_orders: 0,
        monthly_orders: 0,
        yearly_orders: 0
    });
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('today'); // 'today', 'weekly', 'monthly', 'yearly'

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const todayStr = getLocalYYYYMMDD();
            const [salesRes, statsRes] = await Promise.all([
                axios.get(`${API_BASE}/sales`),
                axios.get(`${API_BASE}/sales/stats?today=${todayStr}`)
            ]);
            setSales(salesRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        setLoading(false);
    };

    const getLocalYYYYMMDD = (date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            day: date.toLocaleDateString([], { weekday: 'short' }),
            month: date.toLocaleDateString([], { month: 'short' }),
            fullDate: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
            isoDate: getLocalYYYYMMDD(date)
        };
    };

    const getFilteredSales = () => {
        const now = new Date();
        const today = getLocalYYYYMMDD(now);

        // Start of week (Monday)
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay() || 7;
        startOfWeek.setHours(0, 0, 0, 0);
        if (day !== 1) startOfWeek.setDate(startOfWeek.getDate() - (day - 1));
        const weekStr = getLocalYYYYMMDD(startOfWeek);

        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return sales.filter(sale => {
            const saleDate = new Date(sale.created_at);
            const saleIsoDate = getLocalYYYYMMDD(saleDate);

            if (selectedPeriod === 'today') return saleIsoDate === today;
            if (selectedPeriod === 'weekly') return saleIsoDate >= weekStr;
            if (selectedPeriod === 'monthly') return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
            if (selectedPeriod === 'yearly') return saleDate.getFullYear() === currentYear;
            return true;
        });
    };

    const aggregateProducts = (filteredSales) => {
        const aggregation = {};
        filteredSales.forEach(sale => {
            const items = JSON.parse(sale.items || '[]');
            items.forEach(item => {
                if (!aggregation[item.name]) {
                    aggregation[item.name] = { qty: 0, revenue: 0, image_url: item.image_url };
                }
                aggregation[item.name].qty += item.qty;
                aggregation[item.name].revenue += (item.qty * item.price);
            });
        });
        return Object.entries(aggregation).sort((a, b) => b[1].qty - a[1].qty);
    };

    const filteredSales = getFilteredSales();
    const aggregatedProducts = aggregateProducts(filteredSales);

    const getPeriodStats = () => {
        const periodRevenue = filteredSales.reduce((acc, sale) => acc + parseFloat(sale.total), 0);
        const periodOrders = filteredSales.length;

        switch (selectedPeriod) {
            case 'today': return { rev: periodRevenue, ord: periodOrders, label: "Today" };
            case 'weekly': return { rev: periodRevenue, ord: periodOrders, label: "This Week" };
            case 'monthly': return { rev: periodRevenue, ord: periodOrders, label: "This Month" };
            case 'yearly': return { rev: periodRevenue, ord: periodOrders, label: "This Year" };
            default: return { rev: stats.total_revenue, ord: stats.total_orders, label: "Total" };
        }
    };

    const currentStats = getPeriodStats();

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 animate-page-enter">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-6">
                        <img src="/prism_logo.png" alt="PRISM" className="h-16 w-auto" />
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter uppercase flex items-center gap-4">
                                Sales History
                            </h1>
                            <p className="text-[#666] font-bold tracking-widest uppercase text-sm mt-2">Revenue Tracking & Analytics</p>
                        </div>
                    </div>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 border border-[#333] hover:border-[#ff007f] px-6 py-3 rounded-sm font-bold transition-all uppercase tracking-widest text-xs shadow-[5px_5px_0px_#ff007f10] hover:shadow-[5px_5px_0px_#ff007f30]"
                    >
                        <ArrowLeft size={16} /> {backLabel}
                    </button>
                </div>

                {/* Period Selector Tabs */}
                <div className="flex gap-2 mb-8 bg-[#121212] p-1 border border-[#222] rounded-sm w-fit">
                    {['today', 'weekly', 'monthly', 'yearly'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setSelectedPeriod(p)}
                            className={`px-8 py-3 rounded-sm font-black text-[10px] uppercase tracking-[0.2em] transition-all ${selectedPeriod === p
                                ? 'bg-[#ff007f] text-white shadow-[0_0_20px_#ff007f50]'
                                : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {[
                        { label: `${currentStats.label} Revenue`, value: `$${parseFloat(currentStats.rev || 0).toFixed(2)}`, icon: TrendingUp, color: "#ff007f" },
                        { label: `${currentStats.label} Orders`, value: currentStats.ord, icon: ShoppingBag, color: "#3b82f6" },
                        { label: "Grand Total Revenue", value: `$${parseFloat(stats.total_revenue || 0).toFixed(2)}`, icon: DollarSign, color: "#4ade80" },
                        { label: "Grand Total Orders", value: stats.total_orders, icon: Package, color: "#a855f7" }
                    ].map((stat, i) => (
                        <div key={i} className="bg-[#121212] border border-[#222] p-8 rounded-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <stat.icon size={60} color={stat.color} />
                            </div>
                            <h3 className="text-[#666] text-xs font-black uppercase tracking-[0.2em] mb-4">{stat.label}</h3>
                            <p className="text-3xl font-black tracking-tight" style={{ color: stat.color }}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sales Table */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-[#121212] border border-[#222] rounded-sm overflow-hidden">
                            <div className="p-6 border-b border-[#222] bg-[#090909] flex justify-between items-center">
                                <h2 className="text-lg font-black tracking-widest uppercase flex items-center gap-3">
                                    <Clock className="text-[#ff007f]" size={20} />
                                    Transaction Log ({filteredSales.length})
                                </h2>
                            </div>

                            <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-[#090909] z-10 shadow-md">
                                        <tr className="text-[#666] text-[10px] font-black uppercase tracking-widest border-b border-[#222]">
                                            <th className="p-6">Order ID</th>
                                            <th className="p-6">
                                                {selectedPeriod === 'today' ? 'Time' :
                                                    selectedPeriod === 'weekly' ? 'Day' :
                                                        selectedPeriod === 'monthly' ? 'Date' : 'Month'}
                                            </th>
                                            <th className="p-6">Items</th>
                                            <th className="p-6 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#222]">
                                        {filteredSales.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="p-20 text-center text-[#444] font-black uppercase tracking-widest">
                                                    No transactions for this period
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredSales.map((sale) => {
                                                const { date, time, day, month, fullDate } = formatDate(sale.created_at);
                                                const items = JSON.parse(sale.items || '[]');
                                                return (
                                                    <tr key={sale.id} className="hover:bg-[#ffffff03] transition-colors group">
                                                        <td className="p-6">
                                                            <div className="font-mono text-[#444] group-hover:text-white transition-colors">#{1000 + sale.id}</div>
                                                        </td>
                                                        <td className="p-6 text-[#888] font-bold">
                                                            {selectedPeriod === 'today' && time}
                                                            {selectedPeriod === 'weekly' && day}
                                                            {selectedPeriod === 'monthly' && fullDate}
                                                            {selectedPeriod === 'yearly' && month}
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="flex flex-col gap-1">
                                                                {items.map((it, idx) => (
                                                                    <div key={idx} className="text-xs text-[#aaa]">
                                                                        <span className="text-[#ff007f] font-bold">{it.qty}x</span> {it.name}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="mt-2 text-[9px] font-black text-[#333] uppercase">{sale.payment_method}</div>
                                                        </td>
                                                        <td className="p-6 text-right font-black text-lg text-[#ff007f] tracking-tight">
                                                            ${parseFloat(sale.total).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Aggregated Products Analysis */}
                    <div className="lg:col-span-1">
                        <div className="bg-[#121212] border border-[#222] rounded-sm overflow-hidden h-full">
                            <div className="p-6 border-b border-[#222] bg-[#090909]">
                                <h2 className="text-lg font-black tracking-widest uppercase flex items-center gap-3">
                                    <TrendingUp className="text-[#4ade80]" size={20} />
                                    Products Sold
                                </h2>
                            </div>

                            <div className="p-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                                {aggregatedProducts.length === 0 ? (
                                    <div className="py-20 text-center text-[#444] font-black uppercase tracking-widest text-sm">
                                        No sales data
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {aggregatedProducts.map(([name, data], idx) => (
                                            <div key={idx} className="flex items-center p-4 bg-[#090909] border border-[#222] rounded-sm hover:border-[#ff007f80] transition-all group">
                                                <div className="w-12 h-12 bg-black border border-[#222] mr-4 flex-shrink-0 overflow-hidden relative">
                                                    {data.image_url ? (
                                                        <img src={data.image_url} alt={name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[#222]">
                                                            <Package size={20} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-bold uppercase truncate w-[140px] group-hover:text-white transition-colors">{name}</div>
                                                    <div className="text-xs text-[#444] font-black mt-1 uppercase tracking-tighter">
                                                        Rev: <span className="text-[#4ade80]">${data.revenue.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right ml-4 bg-[#050505] px-3 py-2 border border-[#222] rounded-sm min-w-[60px]">
                                                    <div className="text-[#ff007f] font-black text-lg leading-none">{data.qty}</div>
                                                    <div className="text-[9px] text-[#333] font-black uppercase tracking-tighter mt-1">Units</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default History;
