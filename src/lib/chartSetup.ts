import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export const CHART_FONT = {
  family: "'Inter', 'Segoe UI', system-ui, sans-serif",
  size: 12,
}

export const INCOME_COLOR = '#2f9e44'
export const EXPENSE_COLOR = '#e8590c'
export const MUTED_COLOR = '#868e96'
