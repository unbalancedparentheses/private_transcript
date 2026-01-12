import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

// Re-export commonly used icons for convenience
export {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Copy,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Folder,
  FolderOpen,
  Heart,
  HelpCircle,
  Home,
  Info,
  Loader2,
  Menu,
  Mic,
  MicOff,
  Moon,
  MoreHorizontal,
  MoreVertical,
  Pause,
  PenLine,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Search,
  Settings,
  SkipBack,
  SkipForward,
  Star,
  Sun,
  Trash2,
  Upload,
  User,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
  Monitor,
  Download,
  ExternalLink,
  Clock,
  Calendar,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  List,
  Grid,
  Maximize2,
  Minimize2,
  GripVertical,
  Keyboard,
  Command,
  MessageSquare,
  Send,
  Sparkles,
  Wand2,
  FileDown,
  Columns,
  Save,
} from 'lucide-react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<IconSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
};

interface IconProps {
  icon: LucideIcon;
  size?: IconSize | number;
  className?: string;
  strokeWidth?: number;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
}

export function Icon({
  icon: IconComponent,
  size = 'md',
  className,
  strokeWidth = 2,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = !ariaLabel,
}: IconProps) {
  const pixelSize = typeof size === 'number' ? size : sizeMap[size];

  return (
    <IconComponent
      width={pixelSize}
      height={pixelSize}
      strokeWidth={strokeWidth}
      className={clsx('shrink-0', className)}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    />
  );
}
