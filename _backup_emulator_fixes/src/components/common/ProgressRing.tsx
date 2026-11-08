import React from 'react';

export interface SingleRingProps {
  center: number;
  radius: number;
  stroke: number;
  progress: number; // 0 to 1
  color: string;
  bgColor?: string;
  label?: string;
  valueText?: string;
}

export const SingleRing: React.FC<SingleRingProps> = ({
  center,
  radius,
  stroke,
  progress,
  color,
  bgColor = 'rgba(255, 255, 255, 0.08)',
  label,
  valueText,
}) => {
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference - clampedProgress * circumference;

  return (
    <g>
      {label && <title>{label}{valueText ? `: ${valueText}` : ''}</title>}
      {/* Background track - shares exact center coordinates */}
      <circle
        stroke={bgColor}
        fill="transparent"
        strokeWidth={stroke}
        r={radius}
        cx={center}
        cy={center}
      />
      {/* Active progress - shares exact center coordinates and rotates around center */}
      <circle
        stroke={color}
        fill="transparent"
        strokeWidth={stroke}
        strokeDasharray={`${circumference} ${circumference}`}
        style={{
          strokeDashoffset,
          transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: clampedProgress > 0 ? 1 : 0,
        }}
        strokeLinecap="round"
        r={radius}
        cx={center}
        cy={center}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </g>
  );
};

export interface MultiRingItem {
  id: string;
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
}

export interface MultiRingWidgetProps {
  rings: MultiRingItem[];
  size?: number;
}

export const MultiRingWidget: React.FC<MultiRingWidgetProps> = ({ rings, size = 160 }) => {
  const center = size / 2;
  const stroke = 9;
  const gap = 4.5;
  // Outermost radius leaving breathing room from SVG boundary
  const outerRadius = center - stroke / 2 - 4;

  const averagePercentage = Math.round(
    (rings.reduce((acc, r) => acc + (r.goal > 0 ? Math.min(r.current / r.goal, 1) : 0), 0) /
      (rings.length || 1)) *
      100
  );

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible select-none"
      >
        {rings.map((ring, index) => {
          const ringRadius = outerRadius - index * (stroke + gap);
          const progress = ring.goal > 0 ? ring.current / ring.goal : 0;
          return (
            <SingleRing
              key={ring.id}
              center={center}
              radius={ringRadius}
              stroke={stroke}
              progress={progress}
              color={ring.color}
              label={ring.label}
              valueText={`${ring.current.toLocaleString()} / ${ring.goal.toLocaleString()} ${ring.unit}`}
            />
          );
        })}
      </svg>
      {/* Centered DAILY GOALS label and percentage */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center select-none px-2">
        <span className="text-[9.5px] uppercase tracking-widest text-neutral-400 font-semibold leading-tight">
          Daily Goals
        </span>
        <span className="text-2xl font-bold font-mono-num text-white tracking-tight leading-none mt-1">
          {averagePercentage}%
        </span>
      </div>
    </div>
  );
};
