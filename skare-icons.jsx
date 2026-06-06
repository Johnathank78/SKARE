/* SKARE — Icônes UI minimalistes (trait cohérent). Exposé sur window. */
function SkareIcon({ name, size = 30, color = 'currentColor', strokeWidth = 1.9 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'water': // goutte + ondulation = nettoyage
      return (
        <svg {...common}>
          <path d="M12 3.2c3 3.4 5 6 5 8.6a5 5 0 0 1-10 0c0-2.6 2-5.2 5-8.6Z" />
          <path d="M9.4 12.4c.7.7 1.7.7 2.6 0s1.9-.7 2.6 0" />
        </svg>
      );
    case 'drop': // sérum
      return (
        <svg {...common}>
          <path d="M12 2.5c3.4 4 5.5 6.7 5.5 9.8a5.5 5.5 0 0 1-11 0C6.5 9.2 8.6 6.5 12 2.5Z" />
        </svg>
      );
    case 'cream': // pot de crème
      return (
        <svg {...common}>
          <rect x="4.5" y="9" width="15" height="11" rx="3.5" />
          <path d="M8 9V7.5A2.5 2.5 0 0 1 10.5 5h3A2.5 2.5 0 0 1 16 7.5V9" />
        </svg>
      );
    case 'sun': // SPF
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2M5.4 5.4l1.4 1.4M17.2 17.2l1.4 1.4M18.6 5.4l-1.4 1.4M6.8 17.2l-1.4 1.4" />
        </svg>
      );
    case 'moon': // soin de nuit
      return (
        <svg {...common}>
          <path d="M20 14.2A8 8 0 1 1 9.8 4 6.4 6.4 0 0 0 20 14.2Z" />
        </svg>
      );
    case 'balm': // démaquillant
      return (
        <svg {...common}>
          <path d="M9 3.5h6M10 3.5V6M14 3.5V6" />
          <rect x="7.5" y="6" width="9" height="14.5" rx="3.5" />
        </svg>
      );
    case 'timer':
      return (
        <svg {...common}>
          <circle cx="12" cy="13.5" r="7.5" />
          <path d="M12 13.5V9.5M9.5 2.5h5" />
        </svg>
      );
    case 'play':
      return (
        <svg {...common} fill={color} stroke="none">
          <path d="M8 5.2 18.5 12 8 18.8Z" />
        </svg>
      );
    case 'pause':
      return (
        <svg {...common} fill={color} stroke="none">
          <rect x="7" y="5.5" width="3.4" height="13" rx="1.4" />
          <rect x="13.6" y="5.5" width="3.4" height="13" rx="1.4" />
        </svg>
      );
    case 'reset':
      return (
        <svg {...common}>
          <path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4" />
          <path d="M4 4v4h4" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common} strokeWidth={2.4}>
          <path d="M5 12.5 10 17.5 19 7" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...common}>
          <path d="M14.5 5.5l4 4M4 20l1-4L16 5l3 3L8 19l-4 1Z" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common} strokeWidth={2.2}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'minus':
      return (
        <svg {...common} strokeWidth={2.2}>
          <path d="M5 12h14" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...common} strokeWidth={2.1}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case 'potion': // flacon — « Mes produits »
      return (
        <svg {...common}>
          <path d="M9.5 3h5M10.5 3v4.3L6.7 14.6A4.2 4.2 0 0 0 10.4 21h3.2a4.2 4.2 0 0 0 3.7-6.4L13.5 7.3V3" />
          <path d="M8 14.5h8" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common}>
          <path d="M4.5 6.5h15M9 6.5V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8v1.7M6.5 6.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5" />
        </svg>
      );
    case 'up':
      return (
        <svg {...common} strokeWidth={2.2}>
          <path d="M6 14l6-6 6 6" />
        </svg>
      );
    case 'down':
      return (
        <svg {...common} strokeWidth={2.2}>
          <path d="M6 10l6 6 6-6" />
        </svg>
      );
    case 'close':
      return (
        <svg {...common} strokeWidth={2.2}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case 'chevron':
      return (
        <svg {...common} strokeWidth={2.1}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case 'grip': // poignée de réordonnancement (6 points)
      return (
        <svg {...common} fill={color} stroke="none">
          <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
          <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
          <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
          <path d="M3.5 9.5h17M8 3v4M16 3v4" />
        </svg>
      );
    case 'camera':
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13.5" rx="3.5" />
          <circle cx="12" cy="13.7" r="3.7" />
          <path d="M8.4 7l1.3-2.3h4.6L15.6 7" />
        </svg>
      );
    default:
      return null;
  }
}
Object.assign(window, { SkareIcon });
