"use client";

import { Run } from "@/lib/types";
import { useRunStore } from "@/store/runStore";
import KantoMap from "./KantoMap";

interface Props {
  run: Run;
}

export default function MapView({ run }: Props) {
  const { setSelectedZone, selectedZoneId } = useRunStore();

  function getZoneStatus(zoneId: string) {
    const zone = run.zones.find((z) => z.id === zoneId);
    if (!zone) return "not-visited";
    if (zone.captures.length >= 2) return "multiple";
    return zone.status;
  }

  function handleZoneClick(zoneId: string) {
    setSelectedZone(selectedZoneId === zoneId ? null : zoneId);
  }

  return (
    <div className="rounded-2xl overflow-hidden border-3 border-black bg-white">
      <div className="p-4 bg-gradient-to-r from-blue-100 to-purple-100 border-b-3 border-black flex items-center justify-between">
        <h3 className="font-bold text-black text-lg capitalize">
          {run.region} Region Map
        </h3>
        <div className="flex gap-4 text-xs font-bold">
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-gray-400 border-2 border-black"></span>{" "}
            Not Visited
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-400 border-2 border-black"></span>{" "}
            Visited
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-green-500 border-2 border-black"></span>{" "}
            Captured
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-orange-400 border-2 border-black"></span>{" "}
            Multiple
          </span>
        </div>
      </div>
      <div className="p-4 bg-white">
        <KantoMap
          zones={run.zones}
          selectedZoneId={selectedZoneId}
          onZoneClick={handleZoneClick}
          getZoneStatus={getZoneStatus}
        />
      </div>
    </div>
  );
}
