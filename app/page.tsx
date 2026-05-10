'use client';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowRight, Bed, Bell, CheckCircle2, Globe, ShieldCheck, Smartphone, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white selection:bg-primary/20">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Logo" width={32} height={32} className="text-primary" />
            <span className="text-xl font-heading font-bold tracking-tight">Travels Puri 13 PMS</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">Features</Link>
            <Link href="#benefits" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">Benefits</Link>
            <Link href="/login">
              <Button variant="outline" className="rounded-full px-6 border-gray-200">Login</Button>
            </Link>
            <Link href="/login">
              <Button className="rounded-full px-6">Start Trial</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 -skew-x-12 translate-x-1/4 -z-10" />
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6 px-4 py-1 rounded-full text-sm font-semibold hover:bg-primary/15 transition-colors">
              The Future of Hotel Management
            </Badge>
            <h1 className="text-6xl lg:text-7xl font-heading font-bold leading-[1.1] mb-6">
              Manage your property with <span className="text-primary italic font-medium tracking-tighter">Travels Puri 13</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-lg leading-relaxed">
              A lightning-fast, offline-capable property management system designed for modern hospitality. Real-time sync, stunning UI, and powerful analytics.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/login">
                <Button size="lg" className="rounded-full px-8 py-6 text-lg group bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
                  Get Started for Free <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="rounded-full px-8 py-6 text-lg border-gray-200 hover:bg-gray-50 transition-colors">
                Book a Demo
              </Button>
            </div>
            <div className="mt-12 flex items-center gap-4 text-sm text-gray-500 font-medium">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                  </div>
                ))}
              </div>
              <span>Trusted by 500+ properties worldwide</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white/50 backdrop-blur-sm">
              <img 
                src="/pms_hero_bg.png" 
                alt="Dashboard Preview" 
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent pointer-events-none" />
            </div>
            
            {/* Floating Element 1 */}
            <motion.div 
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3"
            >
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Occupancy</p>
                <p className="text-lg font-bold">98% Today</p>
              </div>
            </motion.div>

            {/* Floating Element 2 */}
            <motion.div 
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-10 -left-10 bg-white p-5 rounded-2xl shadow-xl border border-gray-100"
            >
               <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-primary/10 rounded-2xl text-primary">
                    <Zap size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Revenue</p>
                    <p className="text-xl font-bold">₹1,42,500</p>
                  </div>
               </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-gray-50/50 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-5xl font-heading font-bold mb-6 tracking-tight">Everything you need to scale</h2>
            <p className="text-lg text-gray-600">Built with the latest technology to ensure your hotel operations never miss a beat.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Offline Ready", desc: "Work without internet. Data syncs automatically as soon as you are back online." },
              { icon: Globe, title: "Multi-Property", desc: "Manage multiple properties from a single dashboard with unified reporting." },
              { icon: ShieldCheck, title: "Secure by Design", desc: "Enterprise-grade security with role-based access and detailed audit logs." },
              { icon: Smartphone, title: "Mobile Optimized", desc: "Fully responsive interface that works perfectly on tablets and smartphones." },
              { icon: Bell, title: "Instant Alerts", desc: "Real-time push notifications for new bookings, cancellations, and staff tasks." },
              { icon: Bed, title: "Inventory Engine", desc: "Smart room allocation and availability tracking with 14-day visual grid." },
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -8 }}
                className="p-10 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-primary/5 rounded-[1.5rem] flex items-center justify-center text-primary mb-8">
                  <feature.icon size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed text-base">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
             <Image src="/logo.svg" alt="Logo" width={28} height={28} />
             <span className="text-2xl font-heading font-bold tracking-tighter">Travels Puri 13 PMS</span>
          </div>
          <p className="text-sm text-gray-500 font-medium tracking-wide italic">"Elevate your hospitality experience"</p>
          <div className="flex gap-10">
             <Link href="#" className="text-sm font-medium text-gray-500 hover:text-primary transition-colors">Privacy</Link>
             <Link href="#" className="text-sm font-medium text-gray-500 hover:text-primary transition-colors">Terms</Link>
             <Link href="#" className="text-sm font-medium text-gray-500 hover:text-primary transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}