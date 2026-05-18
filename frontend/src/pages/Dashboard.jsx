import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { MoreHorizontal, MessageCircle, Heart, Share2 } from 'lucide-react';

const Card = ({ title, subtitle, children, extra }) => (
  <div className="bg-white rounded shadow-sm border border-slate-100 h-full">
    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
      <div>
        <h3 className="text-lg font-medium text-slate-700">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {extra}
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

const Dashboard = () => {
  const barData = [
    { name: 'Mon', ample: 9, pixel: 6 },
    { name: 'Tue', ample: 5, pixel: 3 },
    { name: 'Wed', ample: 3, pixel: 9 },
    { name: 'Thu', ample: 7, pixel: 5 },
    { name: 'Fri', ample: 5, pixel: 4 },
    { name: 'Sat', ample: 10, pixel: 6 },
    { name: 'Sun', ample: 3, pixel: 4 },
  ];

  const pieData = [
    { name: 'Mobile', value: 40, color: '#1e88e5' },
    { name: 'Desktop', value: 30, color: '#745af2' },
    { name: 'Tablet', value: 20, color: '#00acc1' },
    { name: 'Other', value: 10, color: '#eceff1' },
  ];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* Top Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Overview */}
        <div className="lg:col-span-2">
          <Card 
            title="Sales Overview" 
            subtitle="Ample Admin Vs Pixel Admin"
            extra={
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#1e88e5]"></div> Ample</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00acc1]"></div> Pixel</div>
              </div>
            }
          >
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{top: 20, right: 0, left: -20, bottom: 0}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="ample" fill="#1e88e5" radius={[2, 2, 0, 0]} barSize={8} />
                  <Bar dataKey="pixel" fill="#00acc1" radius={[2, 2, 0, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Our Visitors */}
        <div>
          <Card title="Our Visitors" subtitle="Different Devices Used to Visit">
            <div className="h-[240px] relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <p className="text-slate-400 text-xs">Our visitor</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-6 text-[10px] font-bold uppercase">
               {pieData.slice(0, 3).map(p => (
                 <div key={p.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: p.color}}></div>
                    {p.name}
                 </div>
               ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="bg-white rounded shadow-sm border border-slate-100 overflow-hidden flex flex-col items-center">
           <div className="w-full h-48 relative">
              <img 
                src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=800" 
                alt="Profile Background" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
           </div>
           
           <div className="-mt-16 z-10 p-1 bg-white rounded-full">
              <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden">
                 <img src="https://i.pravatar.cc/300?u=angela" alt="Avatar" />
              </div>
           </div>

           <div className="p-8 text-center space-y-2">
              <h3 className="text-2xl font-medium text-slate-800">Angela Dominic</h3>
              <p className="text-slate-400 text-sm">Web Designer & Developer</p>
              
              <div className="flex items-center justify-center gap-12 pt-8">
                 <div className="text-center">
                    <p className="text-xl font-bold text-slate-700">1099</p>
                    <p className="text-xs text-slate-400 font-medium">Articles</p>
                 </div>
                 <div className="text-center">
                    <p className="text-xl font-bold text-slate-700">23,469</p>
                    <p className="text-xs text-slate-400 font-medium">Followers</p>
                 </div>
                 <div className="text-center">
                    <p className="text-xl font-bold text-slate-700">6035</p>
                    <p className="text-xs text-slate-400 font-medium">Following</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Activity Tabs */}
        <div className="lg:col-span-2 bg-white rounded shadow-sm border border-slate-100">
           <div className="border-b border-slate-100 px-6 flex items-center gap-8">
              {['Activity', 'Profile', 'Settings'].map((tab, i) => (
                <button 
                  key={tab} 
                  className={cn(
                    "py-5 text-sm font-medium border-b-2 transition-all",
                    i === 0 ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  {tab}
                </button>
              ))}
           </div>

           <div className="p-8 space-y-10">
              <div className="flex gap-6">
                 <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 shadow-md">
                    <img src="https://i.pravatar.cc/100?u=john" alt="User" />
                 </div>
                 <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-2">
                       <span className="font-bold text-slate-700">John Doe</span>
                       <span className="text-xs text-slate-400">5 minutes ago</span>
                    </div>
                    <p className="text-slate-500 text-[15px] leading-relaxed">
                       assign a new task <span className="text-primary font-medium hover:underline cursor-pointer">Design weblayout</span>
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                       {[1, 2, 3, 4].map(n => (
                         <div key={n} className="aspect-video rounded-lg overflow-hidden bg-slate-100 group cursor-pointer shadow-sm">
                            <img 
                              src={`https://picsum.photos/400/225?random=${n}`} 
                              alt="Activity Item" 
                              className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            />
                         </div>
                       ))}
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                       <button className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600">
                          <MessageCircle size={14} /> 2 comment
                       </button>
                       <button className="flex items-center gap-2 text-xs font-bold text-pink-500 hover:text-pink-600">
                          <Heart size={14} fill="currentColor" /> 5 Love
                       </button>
                    </div>
                 </div>
              </div>

              <div className="border-t border-slate-50 pt-10 flex gap-6">
                 <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 shadow-md">
                    <img src="https://i.pravatar.cc/100?u=smith" alt="User" />
                 </div>
                 <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="font-bold text-slate-700">Smith White</span>
                       <span className="text-xs text-slate-400">1 hour ago</span>
                    </div>
                    <p className="text-slate-500 text-[15px] leading-relaxed">
                       Started following <span className="text-primary font-medium hover:underline cursor-pointer">Markarn Doe</span>
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

export default Dashboard;
