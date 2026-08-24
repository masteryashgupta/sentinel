export default function LocationMap({ lat, lon, city, country }) {
  if (!lat || !lon) {
    return (
      <div className="border border-line rounded bg-panel/50 p-4 text-center text-xs text-muted">
        No geographic coordinates available for origin IP map rendering.
      </div>
    );
  }

  const zoom = 5;
  const bboxWidth = 10;
  const bboxHeight = 5;
  const minLon = Math.max(-180, Number(lon) - bboxWidth);
  const minLat = Math.max(-90, Number(lat) - bboxHeight);
  const maxLon = Math.min(180, Number(lon) + bboxWidth);
  const maxLat = Math.min(90, Number(lat) + bboxHeight);

  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLon},${minLat},${maxLon},${maxLat}&layer=mapnik&marker=${lat},${lon}`;

  return (
    <div className="border border-line rounded-lg overflow-hidden bg-panel">
      <div className="p-3 border-b border-line bg-background/50 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-200">
          📍 Origin Location: {[city, country].filter(Boolean).join(", ") || "Coordinates Marker"}
        </span>
        <span className="text-[10px] text-muted font-mono">
          Lat: {Number(lat).toFixed(4)}, Lon: {Number(lon).toFixed(4)} (OpenStreetMap)
        </span>
      </div>
      <div className="h-64 w-full bg-background relative">
        <iframe
          title="Origin Location Map"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight="0"
          marginWidth="0"
          src={osmEmbedUrl}
          className="w-full h-full filter contrast-125 brightness-90 grayscale-[30%]"
        />
      </div>
    </div>
  );
}
