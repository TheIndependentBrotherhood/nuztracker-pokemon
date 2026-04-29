'use client';

import { Run } from '@/lib/types';
import { useRunStore } from '@/store/runStore';
import KantoMap from './KantoMap';

interface Props {
  run: Run;
}

export default function MapView({ run }: Props) {
  const { setSelectedZone, selectedZoneId } = useRunStore();

  function getZoneStatus(zoneId: string) {
    const zone = run.zones.find((z) => z.id === zoneId);
    if (!zone) return 'not-visited';
    if (zone.captures.length >= 2) return 'multiple';
    return zone.status;
  }

  function handleZoneClick(zoneId: string) {
    setSelectedZone(selectedZoneId === zoneId ? null : zoneId);
  }

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
      <div className="p-3 bg-gray-750 border-b border-gray-700 flex items-center gap-4">
        <h3 className="font-bold text-white capitalize">{run.region} Region Map</h3>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-500 inline-block"></span> Not Visited</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block"></span> Visited</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Captured</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block"></span> Multiple</span>
        </div>
      </div>
      <KantoMap
        zones={run.zones}
        selectedZoneId={selectedZoneId}
        onZoneClick={handleZoneClick}
        getZoneStatus={getZoneStatus}
      />
    </div>
  );
}
