'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { day: "Mon", revenue: 12000, occupancy: 65 },
  { day: "Tue", revenue: 18000, occupancy: 70 },
  { day: "Wed", revenue: 24000, occupancy: 82 },
  { day: "Thu", revenue: 21000, occupancy: 75 },
  { day: "Fri", revenue: 32000, occupancy: 88 },
  { day: "Sat", revenue: 45000, occupancy: 95 },
  { day: "Sun", revenue: 38000, occupancy: 90 },
];

export function AnalyticsChart({ data }: { data: any[] }) {
  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
          <XAxis 
            dataKey="day" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            tickFormatter={(value) => `₹${value/1000}k`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "var(--popover)", 
              borderColor: "var(--border)",
              borderRadius: "12px",
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
            }}
            formatter={(value, name) => [`₹${value}`, "Revenue"]} 
            itemStyle={{ color: "var(--primary)", fontSize: "12px", fontWeight: "600" }}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="var(--primary)" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
