import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { ArrowUpRight, ArrowDownRight, Users, MapPin, DollarSign, Activity, AlertTriangle, Zap, Target } from "lucide-react";
import { cn } from "../../utils/cn";
import pollCityLogo from "../../../imports/Poll_City_Logo.png";

const funnelData = [
  { name: "Identified", value: 12400, fill: "#2979FF" },
  { name: "Engaged", value: 8200, fill: "#00E5FF" },
  { name: "Persuaded", value: 4500, fill: "#FFD600" },
  { name: "Committed", value: 3100, fill: "#00C853" },
];

const activityData = [
  { name: "0100", canvassed: 40, calls: 24 },
  { name: "0400", canvassed: 30, calls: 13 },
  { name: "0800", canvassed: 200, calls: 98 },
  { name: "1200", canvassed: 278, calls: 39 },
  { name: "1600", canvassed: 189, calls: 48 },
  { name: "2000", canvassed: 239, calls: 38 },
  { name: "2400", canvassed: 349, calls: 43 },
];

function KPICard({ title, value, change, trend, icon: Icon, colorHex }: any) {
  const isUp = trend === 'up';
  
  return (
    <div className="bg-[#0F1440]/60 backdrop-blur-md rounded-xl border border-[#2979FF]/20 p-5 shadow-[0_4px_30px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-[#00E5FF]/50 transition-all duration-300">
      <div 
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] opacity-20 group-hover:opacity-40 transition-opacity"
        style={{ backgroundColor: colorHex }}
      />
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="text-[#AAB2FF] text-[10px] font-bold uppercase tracking-widest">{title}</div>
        <div 
          className="w-8 h-8 rounded bg-[#050A1F] flex items-center justify-center border border-white/5"
          style={{ color: colorHex, boxShadow: `0 0 15px ${colorHex}40` }}
        >
          <Icon size={16} />
        </div>
      </div>
      
      <div className="text-3xl font-black text-[#F5F7FF] mb-2 tracking-tight relative z-10">{value}</div>
      
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider relative z-10">
        <span 
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/40 border border-white/10"
          style={{ color: isUp ? '#00C853' : '#FF3B30', textShadow: `0 0 8px ${isUp ? '#00C853' : '#FF3B30'}` }}
        >
          {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change}
        </span>
        <span className="text-[#6B72A0]">VS PREV CYCLE</span>
      </div>
    </div>
  );
}

export function Dashboard() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#F5F7FF] uppercase drop-shadow-[0_0_10px_rgba(41,121,255,0.8)]">
            Command Center
          </h1>
          <p className="text-sm text-[#00E5FF] font-semibold mt-1 tracking-widest uppercase flex items-center gap-2">
            <span className="w-2 h-2 bg-[#00E5FF] rounded-full shadow-[0_0_8px_#00E5FF] animate-pulse"></span>
            Real-time Systems Online
          </p>
        </div>
        <div className="flex gap-3 text-[11px] font-bold uppercase tracking-widest">
          <button className="px-4 py-2 bg-[#0F1440] border border-[#2979FF]/30 text-[#AAB2FF] rounded hover:text-[#00E5FF] hover:border-[#00E5FF]/50 transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]">
            Export Matrix
          </button>
          <button className="px-6 py-2 bg-[#FF3B30] text-white rounded hover:bg-red-500 transition-all shadow-[0_0_20px_rgba(255,59,48,0.6)] hover:shadow-[0_0_30px_rgba(255,59,48,0.8)] flex items-center gap-2">
            <Zap size={14} /> Init Sweep
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-6">
        <KPICard title="Voters Acquired" value="45,231" change="12.5%" trend="up" icon={Users} colorHex="#2979FF" />
        <KPICard title="Ground Force Actions" value="8,904" change="3.2%" trend="up" icon={MapPin} colorHex="#00E5FF" />
        <KPICard title="Capital Deployed" value="$1.24M" change="1.4%" trend="down" icon={DollarSign} colorHex="#FFD600" />
        <KPICard title="Current Sentiment" value="54.2%" change="4.1%" trend="up" icon={Activity} colorHex="#00C853" />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="col-span-2 space-y-6">
          
          {/* Conversion Funnel */}
          <div className="bg-[#0F1440]/60 backdrop-blur-md rounded-xl border border-[#2979FF]/20 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#2979FF]/10 blur-[60px] rounded-full"></div>
            
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none mix-blend-screen">
              <img src={pollCityLogo} alt="Poll City Background" className="h-64 object-contain filter grayscale" />
            </div>

            <h2 className="text-[12px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-6 flex items-center gap-2 relative z-10">
              <Target size={14} className="text-[#00E5FF]" /> Persuasion Matrix
            </h2>
            <div className="h-[260px] w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 5 }}>
                  <XAxis key="x" type="number" hide />
                  <YAxis key="y" dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#AAB2FF', fontSize: 11, fontWeight: 700 }} width={100} />
                  <Tooltip 
                    key="tt"
                    cursor={{ fill: 'rgba(41, 121, 255, 0.1)' }} 
                    contentStyle={{ backgroundColor: '#050A1F', border: '1px solid #2979FF', borderRadius: '4px', color: '#F5F7FF', boxShadow: '0 0 20px rgba(41,121,255,0.4)' }} 
                  />
                  <Bar key="bar" dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Graph */}
          <div className="bg-[#0F1440]/60 backdrop-blur-md rounded-xl border border-[#2979FF]/20 p-6 shadow-xl relative overflow-hidden">
            <h2 className="text-[12px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Activity size={14} className="text-[#FF3B30]" /> Live Deployment Feed
            </h2>
            <div className="h-[240px] w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs key="defs">
                    <linearGradient key="grad1" id="colorCanvassed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient key="grad2" id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2979FF" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2979FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis key="x" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B72A0', fontSize: 10, fontWeight: 700 }} dy={10} />
                  <YAxis key="y" axisLine={false} tickLine={false} tick={{ fill: '#6B72A0', fontSize: 10, fontWeight: 700 }} />
                  <Tooltip 
                    key="tt"
                    contentStyle={{ backgroundColor: '#050A1F', border: '1px solid #00E5FF', borderRadius: '4px', color: '#F5F7FF', boxShadow: '0 0 20px rgba(0,229,255,0.4)' }} 
                  />
                  <Area key="area-1" type="monotone" dataKey="canvassed" stroke="#00E5FF" strokeWidth={3} fillOpacity={1} fill="url(#colorCanvassed)" style={{ filter: 'drop-shadow(0 0 8px rgba(0,229,255,0.8))' }} />
                  <Area key="area-2" type="monotone" dataKey="calls" stroke="#2979FF" strokeWidth={3} fillOpacity={1} fill="url(#colorCalls)" style={{ filter: 'drop-shadow(0 0 8px rgba(41,121,255,0.8))' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="col-span-1 space-y-6">
          
          {/* Urgent Alerts */}
          <div className="bg-[#140505]/80 backdrop-blur-md rounded-xl border border-[#FF3B30]/40 shadow-[0_0_30px_rgba(255,59,48,0.15)] overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF3B30] to-transparent opacity-50 animate-[pulse_2s_ease-in-out_infinite]"></div>
            
            <div className="bg-[#FF3B30]/10 px-5 py-3 border-b border-[#FF3B30]/20 flex items-center justify-between">
              <h2 className="text-[11px] font-black text-[#FF3B30] uppercase tracking-[0.2em] flex items-center gap-2 drop-shadow-[0_0_8px_#FF3B30]">
                <AlertTriangle size={14} /> Threat Intel
              </h2>
              <span className="text-[10px] font-bold bg-[#FF3B30] text-white px-2 py-0.5 rounded shadow-[0_0_10px_#FF3B30]">3</span>
            </div>
            
            <div className="divide-y divide-[#FF3B30]/10">
              {[
                { title: "Precinct 12 completion critical.", desc: "Re-assign 4 units immediately.", time: "2m ago" },
                { title: "Print order #4922 delayed.", desc: "Vendor stock short.", time: "14m ago" },
                { title: "Sentiment spike: District 4.", desc: "Social keyword 'taxes' trending negative.", time: "1h ago" },
              ].map((alert, i) => (
                <div key={i} className="p-4 hover:bg-[#FF3B30]/5 transition-colors cursor-pointer group-hover:border-l-2 border-l-2 border-transparent hover:!border-[#FF3B30]">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[12px] font-bold text-[#F5F7FF] drop-shadow-md">{alert.title}</p>
                    <span className="text-[9px] text-[#FF3B30] font-bold">{alert.time}</span>
                  </div>
                  <p className="text-[11px] text-[#AAB2FF]">{alert.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Tasks */}
          <div className="bg-[#0F1440]/60 backdrop-blur-md rounded-xl border border-[#2979FF]/20 shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2979FF]/20 flex items-center justify-between">
              <h2 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em]">Priority Protocols</h2>
              <button className="text-[10px] text-[#00E5FF] font-bold tracking-widest uppercase hover:text-white transition-colors">Expand</button>
            </div>
            <div className="p-2">
              {[
                { task: "Approve ad copy: Mailer 4", status: "pending", type: "Approval" },
                { task: "Capital Call: Top 5", status: "pending", type: "Comms" },
                { task: "Review polling toplines", status: "pending", type: "Data" },
                { task: "Authorize deployment map", status: "done", type: "Ops" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 hover:bg-[#2979FF]/10 rounded border border-transparent hover:border-[#2979FF]/30 group cursor-pointer transition-all">
                  <div className="mt-0.5">
                    {item.status === 'done' 
                      ? <div className="w-3 h-3 bg-[#00C853] shadow-[0_0_8px_#00C853] rounded-sm transform rotate-45" />
                      : <div className="w-3 h-3 border border-[#2979FF] group-hover:border-[#00E5FF] group-hover:shadow-[0_0_8px_#00E5FF] rounded-sm transform rotate-45 transition-colors" />}
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "text-[12px] font-bold",
                      item.status === 'done' ? "text-[#6B72A0] line-through" : "text-[#F5F7FF]"
                    )}>{item.task}</p>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#AAB2FF] mt-1 bg-[#050A1F] inline-block px-1.5 py-0.5 rounded border border-[#2979FF]/30">
                      {item.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
