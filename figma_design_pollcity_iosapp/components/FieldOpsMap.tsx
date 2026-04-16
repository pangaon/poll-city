import { motion } from 'motion/react';
import { MapPin, Users, Route, Target, Zap, Circle } from 'lucide-react';

export function FieldOpsMap() {
  const canvassers = [
    { id: 1, name: 'Sarah K.', lat: 35, lng: 42, status: 'active', route: 'R7B', doorsToday: 23 },
    { id: 2, name: 'Michael P.', lat: 58, lng: 28, status: 'active', route: 'R4A', doorsToday: 31 },
    { id: 3, name: 'David C.', lat: 72, lng: 65, status: 'active', route: 'R12C', doorsToday: 18 },
    { id: 4, name: 'Lisa W.', lat: 25, lng: 78, status: 'break', route: 'R9A', doorsToday: 12 },
  ];

  const routes = [
    { id: 'R7B', name: 'Danforth Ave East', color: '#EF9F27', coverage: 67, path: 'M 20 30 Q 40 25 60 35 T 80 40' },
    { id: 'R4A', name: 'Main Street', color: '#1D9E75', coverage: 100, path: 'M 50 20 Q 55 40 52 60 T 48 80' },
    { id: 'R12C', name: 'Lakeside', color: '#0A2342', coverage: 45, path: 'M 65 50 Q 75 55 80 65 T 85 75' },
  ];

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl overflow-hidden border border-neutral-200">
      {/* Map Grid Background */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(10, 35, 66, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(10, 35, 66, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }} />

      {/* Ward Boundaries */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Ward 3 Boundary */}
        <path
          d="M 10 15 L 90 15 L 88 85 L 12 87 Z"
          fill="rgba(29, 158, 117, 0.05)"
          stroke="#1D9E75"
          strokeWidth="2"
          strokeDasharray="5,5"
          opacity="0.4"
        />

        {/* Routes */}
        {routes.map((route) => (
          <g key={route.id}>
            <path
              d={route.path}
              fill="none"
              stroke={route.color}
              strokeWidth="3"
              strokeOpacity="0.6"
              strokeLinecap="round"
            />
            <motion.circle
              r="4"
              fill={route.color}
              initial={{ offsetDistance: '0%' }}
              animate={{ offsetDistance: '100%' }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <animateMotion dur="8s" repeatCount="indefinite">
                <mpath href={`#${route.id}-path`} />
              </animateMotion>
            </motion.circle>
          </g>
        ))}
      </svg>

      {/* Live Canvassers */}
      {canvassers.map((canvasser, i) => (
        <motion.div
          key={canvasser.id}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
          className="absolute"
          style={{ left: `${canvasser.lng}%`, top: `${canvasser.lat}%`, transform: 'translate(-50%, -50%)' }}
        >
          {/* Pulse Ring */}
          {canvasser.status === 'active' && (
            <motion.div
              className="absolute inset-0 -m-4"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-full h-full rounded-full bg-[#1D9E75]" />
            </motion.div>
          )}

          {/* Canvasser Pin */}
          <div className="relative">
            <div className={`size-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${
              canvasser.status === 'active' ? 'bg-[#1D9E75]' : 'bg-amber-500'
            }`}>
              <Users className="size-5 text-white" />
            </div>

            {/* Tooltip */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileHover={{ opacity: 1, y: 0 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none"
            >
              <div className="bg-[#0A2342] text-white px-3 py-2 rounded-lg shadow-xl text-xs whitespace-nowrap">
                <div className="font-semibold">{canvasser.name}</div>
                <div className="text-white/70">Route {canvasser.route} · {canvasser.doorsToday} doors</div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#0A2342]" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      ))}

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-neutral-200">
        <div className="text-xs font-bold text-neutral-900 mb-3 uppercase tracking-wide">Live Activity</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-[#1D9E75]" />
            <span className="text-neutral-700">Active Canvasser</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-amber-500" />
            <span className="text-neutral-700">On Break</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-[#1D9E75]" />
            <span className="text-neutral-700">Completed Route</span>
          </div>
        </div>
      </div>

      {/* Live Stats Overlay */}
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-neutral-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="size-2 rounded-full bg-[#1D9E75] animate-pulse" />
          <span className="text-xs font-bold text-neutral-900 uppercase tracking-wide">Live Now</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-neutral-600">Active</span>
            <span className="text-sm font-semibold text-neutral-900">3</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-neutral-600">Doors Today</span>
            <span className="text-sm font-semibold text-neutral-900">84</span>
          </div>
        </div>
      </div>
    </div>
  );
}
