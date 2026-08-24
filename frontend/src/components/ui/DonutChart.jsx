import React from "react";

// Helper to calculate SVG arc path
function getArcPath(x, y, radius, startAngle, endAngle) {
  const polarToCartesian = (centerX, centerY, r, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M", start.x, start.y, 
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
}

export default function DonutChart({ data, className = "", size = 200, strokeWidth = 25 }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // If no data, show a muted circle
  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          fill="transparent"
          stroke="var(--bg-subtle)"
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }

  let currentAngle = 0;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      {data.map((item, index) => {
        if (item.value === 0) return null;
        
        const angle = (item.value / total) * 360;
        const isFullCircle = item.value === total;
        
        let pathData;
        if (isFullCircle) {
           pathData = `
             M ${center}, ${center - radius}
             A ${radius}, ${radius} 0 1,1 ${center}, ${center + radius}
             A ${radius}, ${radius} 0 1,1 ${center}, ${center - radius}
           `;
        } else {
           pathData = getArcPath(center, center, radius, currentAngle, currentAngle + angle);
        }
        
        const path = (
          <path
            key={item.label || index}
            d={pathData}
            fill="transparent"
            stroke={item.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-500 ease-in-out"
          />
        );
        
        currentAngle += angle;
        return path;
      })}
    </svg>
  );
}
