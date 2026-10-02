"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

type MetricsProps = {
  burnRateData: { day: string; amount: number }[];
  hallOfFameData: { name: string; xp: number }[];
};

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function MetricsCharts({ burnRateData, hallOfFameData }: MetricsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2 mt-8">
      {/* Burn Rate */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-warm-200 dark:border-stone-800 shadow-sm flex flex-col">
        <h3 className="font-display font-bold text-xl text-stone-800 dark:text-stone-200 mb-6 flex items-center gap-2">
          🔥 Burn Rate (Mês Atual)
        </h3>
        <div className="flex-1 min-h-[250px] w-full">
          {burnRateData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-stone-400 font-medium">Nenhum gasto neste mês.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burnRateData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Gasto Acumulado"]}
                  labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                />
                <Line type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Hall da Fama */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-warm-200 dark:border-stone-800 shadow-sm flex flex-col">
        <h3 className="font-display font-bold text-xl text-stone-800 dark:text-stone-200 mb-6 flex items-center gap-2">
          🏆 Hall da Fama (Tarefas)
        </h3>
        <div className="flex-1 min-h-[250px] w-full flex items-center justify-center">
          {hallOfFameData.length === 0 ? (
            <div className="text-stone-400 font-medium">Nenhuma tarefa concluída.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={hallOfFameData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="xp"
                  stroke="none"
                >
                  {hallOfFameData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value} XP`, "Experiência"]}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
