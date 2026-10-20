import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PieController,
  PointElement,
  Tooltip,
} from 'chart.js'

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  DoughnutController,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PieController,
  PointElement,
  Tooltip,
)

export const CHART_FONT = {
  family: "'Segoe UI Variable Text', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif",
  size: 12,
}

export const INCOME_COLOR = '#059669'
export const EXPENSE_COLOR = '#0F766E'
export const MUTED_COLOR = '#64748B'
