interface Props {
  icon: string;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: Props) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-5 hover:border-blue-500/40 hover:bg-slate-800/80 transition-all duration-200 hover:-translate-y-0.5">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}
