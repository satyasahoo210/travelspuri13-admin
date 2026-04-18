'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BedDouble, Users, CreditCard, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import { cn } from "@/lib/utils";

const stats = [
  { label: 'Occupancy', value: '78%', sub: '+4% from last week', trend: 'up', icon: BedDouble },
  { label: 'Revenue Today', value: '₹42,500', sub: '+12% from avg', trend: 'up', icon: CreditCard },
  { label: 'Check-ins', value: '14', sub: '8 Check-outs today', trend: 'neutral', icon: Activity },
  { label: 'Total Guests', value: '42', sub: 'In house', trend: 'up', icon: Users },
];

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back, here's what's happening today.</p>
        </div>
        <div className="hidden md:block">
           <p className="text-sm font-medium text-muted-foreground">Saturday, April 18, 2026</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="premium-card overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-primary/5 rounded-lg">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  {stat.trend === 'up' ? (
                    <div className="flex items-center text-xs font-medium text-emerald-600">
                      {stat.sub} <ArrowUpRight className="ml-1 h-3 w-3" />
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-muted-foreground">
                      {stat.sub}
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 premium-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading">Revenue Trends</CardTitle>
              <p className="text-xs text-muted-foreground">Daily performance for the current week</p>
            </div>
            <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 font-bold">
              +12.5%
            </Badge>
          </CardHeader>
          <CardContent>
            <AnalyticsChart />
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="font-heading">Room Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Available</span>
                  <span className="font-bold">12</span>
                </div>
                <div className="w-full bg-secondary/50 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: '40%' }} />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Occupied</span>
                  <span className="font-bold">18</span>
                </div>
                <div className="w-full bg-secondary/50 h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '60%' }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Cleaning</span>
                  <span className="font-bold">4</span>
                </div>
                <div className="w-full bg-secondary/50 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full" style={{ width: '15%' }} />
                </div>
              </div>

              <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-xs font-bold text-primary uppercase tracking-tight mb-2">Pro Tip</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  High occupancy expected this weekend. Ensure all 4 rooms under maintenance are ready by Friday.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="font-heading">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { name: 'John Doe', action: 'checked in', detail: 'Room 204', time: '10:30 AM', status: 'In House' },
                { name: 'Alice Smith', action: 'booked', detail: 'Deluxe Suite', time: '09:15 AM', status: 'Confirmed' },
                { name: 'Bob Wilson', action: 'payment failed', detail: 'Booking #8291', time: '08:45 AM', status: 'Action Required' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center font-bold text-xs text-primary">
                    {item.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name} <span className="text-muted-foreground font-normal">{item.action}</span></p>
                    <p className="text-xs text-muted-foreground">{item.detail} • {item.time}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "font-normal text-[10px] uppercase tracking-wider",
                      item.status === 'Action Required' ? "text-destructive border-destructive/20 bg-destructive/5" : ""
                    )}
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
