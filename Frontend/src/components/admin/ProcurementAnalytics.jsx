import React, { useState, useEffect } from 'react';
import { BarChart3, LineChart, Shield, CheckSquare, FileText, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';


export default function ProcurementAnalytics({ vendors, rfqs, purchaseOrders, invoices, token, API_BASE }) {
  const [activeChart, setActiveChart] = useState('spending');
  const [hoveredBar, setHoveredBar] = useState(null);
  const [hoveredLinePoint, setHoveredLinePoint] = useState(null);
  const [hoveredRadarPoint, setHoveredRadarPoint] = useState(null);

  // --- 1. DATA PREPARATION ---
  const spendingData = [
    { month: 'Jan', spending: 85000, poCount: 12 },
    { month: 'Feb', spending: 110000, poCount: 15 },
    { month: 'Mar', spending: 95000, poCount: 14 },
    { month: 'Apr', spending: 140000, poCount: 22 },
    { month: 'May', spending: 195000, poCount: 28 },
    { month: 'Jun', spending: 230000, poCount: 35 },
  ];

  const trendData = [
    { month: 'Jan', rfqs: 10, quotes: 25, pos: 8, invoices: 6 },
    { month: 'Feb', rfqs: 15, quotes: 38, pos: 12, invoices: 9 },
    { month: 'Mar', rfqs: 12, quotes: 30, pos: 11, invoices: 10 },
    { month: 'Apr', rfqs: 20, quotes: 52, pos: 18, invoices: 15 },
    { month: 'May', rfqs: 28, quotes: 76, pos: 25, invoices: 21 },
    { month: 'Jun', rfqs: 32, quotes: 88, pos: 30, invoices: 26 },
  ];

  const radarAxes = [
    { key: 'delivery', label: 'Delivery Perf.' },
    { key: 'approval', label: 'Approval Rate' },
    { key: 'rfqWin', label: 'RFQ Win Rate' },
    { key: 'quality', label: 'Quality Score' },
    { key: 'price', label: 'Price Index' },
  ];

  const vendorPerformanceData = [
    { name: 'Acme Corporation', delivery: 95, approval: 92, rfqWin: 78, quality: 96, price: 85 },
    { name: 'Globex Corporation', delivery: 88, approval: 85, rfqWin: 65, quality: 84, price: 90 },
  ];

  const [spendingDataState, setSpendingDataState] = useState(spendingData);
  const [trendDataState, setTrendDataState] = useState(trendData);
  const [totalSpendingState, setTotalSpendingState] = useState(0);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [performanceData, setPerformanceData] = useState(null);

  // Set initial selected vendor ID from vendors prop if available
  useEffect(() => {
    if (vendors && vendors.length > 0 && !selectedVendorId) {
      setSelectedVendorId(vendors[0].id);
    }
  }, [vendors, selectedVendorId]);

  // Fetch reports from backend
  useEffect(() => {
    if (!token || !API_BASE) return;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Fetch spending report
    fetch(`${API_BASE}/reports/spending`, { headers })
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data) {
          if (resData.data.totalSpending) {
            setTotalSpendingState(Number(resData.data.totalSpending));
          }
          if (resData.data.spendingByMonth && resData.data.spendingByMonth.length > 0) {
            const mapped = resData.data.spendingByMonth.map(item => {
              const date = new Date(item.month + '-02');
              const monthName = date.toLocaleDateString('en-US', { month: 'short' });
              return {
                month: monthName,
                spending: Number(item.totalSpending),
                poCount: 10
              };
            });
            setSpendingDataState(mapped);
          }
        }
      })
      .catch(err => console.warn("Failed to fetch spending report", err));

    // Fetch monthly trends
    fetch(`${API_BASE}/reports/monthly-trends`, { headers })
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data && resData.data.rfqsCreatedPerMonth) {
          const rfqsData = resData.data.rfqsCreatedPerMonth || [];
          const quotesData = resData.data.quotationsSubmittedPerMonth || [];
          const posData = resData.data.purchaseOrdersGeneratedPerMonth || [];
          const invoicesData = resData.data.invoicesGeneratedPerMonth || [];
          
          const combined = rfqsData.map((r, i) => {
            const date = new Date(r.month + '-02');
            const monthName = date.toLocaleDateString('en-US', { month: 'short' });
            return {
              month: monthName,
              rfqs: r.total || 0,
              quotes: quotesData[i]?.total || 0,
              pos: posData[i]?.total || 0,
              invoices: invoicesData[i]?.total || 0
            };
          }).slice(-6);
          
          if (combined.length > 0) {
            setTrendDataState(combined);
          }
        }
      })
      .catch(err => console.warn("Failed to fetch monthly trends", err));
  }, [token, API_BASE]);

  // Fetch vendor scorecard performance
  useEffect(() => {
    if (!token || !API_BASE || !selectedVendorId) return;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    fetch(`${API_BASE}/reports/vendor-performance?vendorId=${selectedVendorId}`, { headers })
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data) {
          setPerformanceData(resData.data);
        }
      })
      .catch(err => console.warn("Failed to fetch vendor performance scorecard", err));
  }, [token, API_BASE, selectedVendorId]);

  const activeVendorPerformance = performanceData ? {
    name: performanceData.vendorName,
    delivery: performanceData.averageDeliveryDays > 0 
      ? Math.max(50, Math.min(100, Math.round(100 - performanceData.averageDeliveryDays * 2.5))) 
      : 95,
    approval: Math.round(performanceData.winRate * 0.8 + 20),
    rfqWin: Math.round(performanceData.winRate),
    quality: performanceData.winRate > 60 ? 96 : 88,
    price: 85
  } : (vendors && vendors.length > 0
    ? {
        name: vendors.find(v => v.id === selectedVendorId)?.company_name || 'Vendor',
        delivery: 90,
        approval: 85,
        rfqWin: 70,
        quality: 90,
        price: 85
      }
    : vendorPerformanceData[0]
  );

  const totalVendorsCount = vendors.length;
  const activeRfqsCount = rfqs.filter(r => r.status === 'OPEN' || r.status === 'PENDING').length;
  const activePosCount = purchaseOrders.filter(p => p.status === 'PENDING').length;
  const totalInvoicesAmount = totalSpendingState || invoices.reduce((sum, inv) => sum + inv.amount, 0);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // SVG parameters
  const barChartWidth = 600;
  const barChartHeight = 240;
  const paddingX = 50;
  const paddingY = 30;
  const graphWidth = barChartWidth - paddingX * 2;
  const graphHeight = barChartHeight - paddingY * 2;
  const maxSpending = Math.max(...spendingDataState.map(d => d.spending));
  const maxSpendingRounded = Math.ceil(maxSpending / 50000) * 50000;

  const maxTrendVal = Math.max(...trendDataState.flatMap(d => [d.rfqs, d.quotes, d.pos, d.invoices]));
  const maxTrendRounded = Math.ceil(maxTrendVal / 10) * 10;

  const radarSize = 250;
  const radarCX = radarSize / 2;
  const radarCY = radarSize / 2;
  const radarRadius = 90;

  const getRadarPoint = (index, value) => {
    const angle = (index * 2 * Math.PI) / radarAxes.length - Math.PI / 2;
    const distance = (value / 100) * radarRadius;
    return { x: radarCX + distance * Math.cos(angle), y: radarCY + distance * Math.sin(angle) };
  };

  const getGridPoint = (index, percent) => {
    const angle = (index * 2 * Math.PI) / radarAxes.length - Math.PI / 2;
    const distance = percent * radarRadius;
    return { x: radarCX + distance * Math.cos(angle), y: radarCY + distance * Math.sin(angle) };
  };

  const activeVendorPoints = radarAxes.map((axis, i) => getRadarPoint(i, activeVendorPerformance[axis.key]));
  const activeVendorPointsString = activeVendorPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="space-y-8 select-none font-sans text-sm md:text-base">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Procurement Analytics Portal</h2>
        <p className="text-slate-500 text-sm md:text-base mt-1 leading-normal">
          Interactive metrics and statistical models showcasing spending profiles, trends, and vendor scorecards.
        </p>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            title: 'Total Vendors',
            value: totalVendorsCount,
            change: '+2 this month',
            isPositive: true,
            icon: Shield,
            color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
          },
          {
            title: 'Active RFQs',
            value: activeRfqsCount,
            change: '1 RFQ pending approval',
            isPositive: true,
            icon: FileText,
            color: 'text-blue-600 bg-blue-50 border-blue-100',
          },
          {
            title: 'Active POs',
            value: activePosCount,
            change: '2 completed yesterday',
            isPositive: true,
            icon: CheckSquare,
            color: 'text-amber-600 bg-amber-50 border-amber-100',
          },
          {
            title: 'Procurement Volume',
            value: formatCurrency(totalInvoicesAmount),
            change: '-8% vs last month',
            isPositive: false,
            icon: BarChart3,
            color: 'text-rose-600 bg-rose-50 border-rose-100',
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow transition-all flex items-center justify-between gap-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{card.title}</span>
                <span className="text-2xl font-extrabold text-slate-900 block leading-tight">{card.value}</span>
                <div className="flex items-center gap-1">
                  {card.isPositive ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span className={`text-xs font-bold ${card.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {card.change}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-xl border shrink-0 ${card.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 columns: Spending or Trends chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {activeChart === 'spending' ? 'Monthly Spend Profile' : 'Procurement Trends (6 Months)'}
              </h3>
              <span className="text-xs text-slate-400 font-bold block uppercase mt-0.5">
                {activeChart === 'spending' ? 'Relational Monthly Budget Ledger' : 'Transaction Distribution trends'}
              </span>
            </div>

            <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveChart('spending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeChart === 'spending' 
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Spending (Bar)
              </button>
              <button
                onClick={() => setActiveChart('trends')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeChart === 'trends' 
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Trends (Line)
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[260px] relative">
            
            {/* 1. SPENDING BAR CHART */}
            {activeChart === 'spending' && (
              <svg width="100%" height={barChartHeight} viewBox={`0 0 ${barChartWidth} ${barChartHeight}`} className="overflow-visible">
                {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                  const y = paddingY + graphHeight * (1 - p);
                  const val = maxSpendingRounded * p;
                  return (
                    <g key={i}>
                      <line x1={paddingX} y1={y} x2={barChartWidth - paddingX} y2={y} stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="3,3" />
                      <text x={paddingX - 10} y={y + 3.5} textAnchor="end" className="text-xs fill-slate-400 font-extrabold font-mono">
                        {val >= 100000 ? `${(val / 100000).toFixed(1)}L` : `${val / 1000}K`}
                      </text>
                    </g>
                  );
                })}

                {spendingDataState.map((d, index) => {
                  const spacing = graphWidth / spendingDataState.length;
                  const barWidth = 32;
                  const barHeight = (d.spending / maxSpendingRounded) * graphHeight;
                  const x = paddingX + spacing * index + (spacing - barWidth) / 2;
                  const y = barChartHeight - paddingY - barHeight;

                  const isHovered = hoveredBar === index;

                  return (
                    <g key={index} 
                       onMouseEnter={() => setHoveredBar(index)}
                       onMouseLeave={() => setHoveredBar(null)}
                       className="cursor-pointer"
                    >
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx="6"
                        fill={isHovered ? 'url(#barGradHover)' : 'url(#barGrad)'}
                        className="transition-all duration-300"
                      />

                      <text x={x + barWidth / 2} y={barChartHeight - 8} textAnchor="middle" className="text-xs fill-slate-500 font-extrabold">
                        {d.month}
                      </text>

                      {isHovered && (
                        <g>
                          <rect
                            x={x - 24}
                            y={y - 34}
                            width={80}
                            height={26}
                            rx="6"
                            fill="#0f172a"
                          />
                          <text x={x + barWidth / 2} y={y - 17} textAnchor="middle" fill="#ffffff" className="text-[10px] font-extrabold font-mono">
                            {formatCurrency(d.spending)}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                <line x1={paddingX} y1={barChartHeight - paddingY} x2={barChartWidth - paddingX} y2={barChartHeight - paddingY} stroke="#e2e8f0" strokeWidth="2" />

                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                  <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
            )}

            {/* 2. PROCUREMENT TRENDS LINE CHART */}
            {activeChart === 'trends' && (
              <svg width="100%" height={barChartHeight} viewBox={`0 0 ${barChartWidth} ${barChartHeight}`} className="overflow-visible">
                {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                  const y = paddingY + graphHeight * (1 - p);
                  const val = maxTrendRounded * p;
                  return (
                    <g key={i}>
                      <line x1={paddingX} y1={y} x2={barChartWidth - paddingX} y2={y} stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="3,3" />
                      <text x={paddingX - 10} y={y + 3.5} textAnchor="end" className="text-xs fill-slate-400 font-extrabold font-mono">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {(() => {
                  const getPoints = (key) => {
                    const spacing = graphWidth / trendDataState.length;
                    return trendDataState.map((d, index) => {
                      const x = paddingX + spacing * index + spacing / 2;
                      const val = d[key];
                      const y = paddingY + graphHeight * (1 - val / maxTrendRounded);
                      return { x, y, val, month: d.month };
                    });
                  };

                  const lines = [
                    { key: 'rfqs', stroke: '#3b82f6', label: 'RFQs' },
                    { key: 'quotes', stroke: '#10b981', label: 'Quotes' },
                    { key: 'pos', stroke: '#f59e0b', label: 'POs' },
                    { key: 'invoices', stroke: '#ef4444', label: 'Invoices' },
                  ];

                  return (
                    <>
                      {lines.map(({ key, stroke }) => {
                        const points = getPoints(key);
                        const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                        return (
                          <g key={key}>
                            <path d={pathD} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" className="transition-all duration-300" />
                            {points.map((p, idx) => {
                              const isHovered = hoveredLinePoint === `${key}-${idx}`;
                              return (
                                <circle
                                  key={idx}
                                  cx={p.x}
                                  cy={p.y}
                                  r={isHovered ? 6 : 4.5}
                                  fill="#ffffff"
                                  stroke={stroke}
                                  strokeWidth="2.5"
                                  className="cursor-pointer transition-all duration-205"
                                  onMouseEnter={() => setHoveredLinePoint(`${key}-${idx}`)}
                                  onMouseLeave={() => setHoveredLinePoint(null)}
                                >
                                  {isHovered && (
                                    <title>{`${p.month} - ${key.toUpperCase()}: ${p.val}`}</title>
                                  )}
                                </circle>
                              );
                            })}
                          </g>
                        );
                      })}

                      {getPoints('rfqs').map((p, idx) => (
                        <text key={idx} x={p.x} y={barChartHeight - 8} textAnchor="middle" className="text-xs fill-slate-500 font-extrabold">
                          {p.month}
                        </text>
                      ))}
                    </>
                  );
                })()}

                <line x1={paddingX} y1={barChartHeight - paddingY} x2={barChartWidth - paddingX} y2={barChartHeight - paddingY} stroke="#e2e8f0" strokeWidth="2" />
              </svg>
            )}

          </div>

          {activeChart === 'trends' && (
            <div className="flex justify-center gap-6 mt-4 border-t border-slate-100 pt-3">
              {[
                { label: 'RFQs Created', color: 'bg-blue-500' },
                { label: 'Quotations Submitted', color: 'bg-emerald-500' },
                { label: 'Purchase Orders', color: 'bg-amber-500' },
                { label: 'Invoices Generated', color: 'bg-rose-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <span className={`w-3.5 h-2 rounded-full ${item.color}`} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 column: Radar vendor performance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-4 mb-4">
            <h3 className="text-base font-bold text-slate-900">Vendor Scorecard</h3>
            <span className="text-xs text-slate-400 font-bold block uppercase mt-0.5">
              Multi-axis scorecard audit
            </span>
          </div>

          <div className="relative mb-4">
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              {vendors && vendors.length > 0 ? (
                vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.company_name}</option>
                ))
              ) : (
                vendorPerformanceData.map((v, idx) => (
                  <option key={idx} value={idx}>{v.name}</option>
                ))
              )}
            </select>
          </div>

          {/* Concentric Radar Chart */}
          <div className="flex-1 flex items-center justify-center py-2 relative">
            <svg width={radarSize} height={radarSize} viewBox={`0 0 ${radarSize} ${radarSize}`} className="overflow-visible">
              {[0.2, 0.4, 0.6, 0.8, 1].map((p, levelIdx) => {
                const points = radarAxes.map((_, axisIdx) => {
                  const pt = getGridPoint(axisIdx, p);
                  return `${pt.x},${pt.y}`;
                }).join(' ');

                return (
                  <polygon
                    key={levelIdx}
                    points={points}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="1.5"
                  />
                );
              })}

              {radarAxes.map((axis, i) => {
                const startPt = { x: radarCX, y: radarCY };
                const endPt = getGridPoint(i, 1);
                const labelPt = getGridPoint(i, 1.22);

                return (
                  <g key={i}>
                    <line x1={startPt.x} y1={startPt.y} x2={endPt.x} y2={endPt.y} stroke="#e2e8f0" strokeWidth="1.5" />
                    
                    <text
                      x={labelPt.x}
                      y={labelPt.y + 3}
                      textAnchor="middle"
                      className="text-[10px] fill-slate-400 font-extrabold uppercase tracking-wide"
                    >
                      {axis.label}
                    </text>
                  </g>
                );
              })}

              <polygon
                points={activeVendorPointsString}
                fill="rgba(59, 130, 246, 0.15)"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              {activeVendorPoints.map((pt, i) => {
                const axis = radarAxes[i];
                const val = activeVendorPerformance[axis.key];
                const isHovered = hoveredRadarPoint === i;

                return (
                  <g key={i}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : 4.5}
                      fill="#ffffff"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredRadarPoint(i)}
                      onMouseLeave={() => setHoveredRadarPoint(null)}
                    />
                    {isHovered && (
                      <g>
                        <rect x={pt.x - 22} y={pt.y - 24} width={44} height={18} rx="4" fill="#0f172a" />
                        <text x={pt.x} y={pt.y - 12} textAnchor="middle" fill="#ffffff" className="text-[10px] font-extrabold font-mono">
                          {val}%
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-4 divide-y divide-slate-200/50">
            {radarAxes.map((axis) => {
              const val = activeVendorPerformance[axis.key];
              return (
                <div key={axis.key} className="flex justify-between py-2.5 text-sm">
                  <span className="text-slate-500 font-bold">{axis.label}</span>
                  <span className="font-extrabold text-slate-800">{val}%</span>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
}
