// Dynamic imports for chart components to improve bundle size
export const loadBarChart = () => import('recharts').then(module => module.BarChart)
export const loadBar = () => import('recharts').then(module => module.Bar)
export const loadXAxis = () => import('recharts').then(module => module.XAxis)
export const loadYAxis = () => import('recharts').then(module => module.YAxis)
export const loadCartesianGrid = () => import('recharts').then(module => module.CartesianGrid)
export const loadTooltip = () => import('recharts').then(module => module.Tooltip)
export const loadResponsiveContainer = () => import('recharts').then(module => module.ResponsiveContainer)
export const loadLineChart = () => import('recharts').then(module => module.LineChart)
export const loadLine = () => import('recharts').then(module => module.Line)
export const loadPieChart = () => import('recharts').then(module => module.PieChart)
export const loadPie = () => import('recharts').then(module => module.Pie)
export const loadCell = () => import('recharts').then(module => module.Cell)

// Load all chart components at once
export const loadAllCharts = async () => {
  const [
    { default: BarChart },
    { default: Bar },
    { default: XAxis },
    { default: YAxis },
    { default: CartesianGrid },
    { default: Tooltip },
    { default: ResponsiveContainer },
    { default: LineChart },
    { default: Line },
    { default: PieChart },
    { default: Pie },
    { default: Cell }
  ] = await Promise.all([
    import('recharts').then(module => ({ default: module.BarChart })),
    import('recharts').then(module => ({ default: module.Bar })),
    import('recharts').then(module => ({ default: module.XAxis })),
    import('recharts').then(module => ({ default: module.YAxis })),
    import('recharts').then(module => ({ default: module.CartesianGrid })),
    import('recharts').then(module => ({ default: module.Tooltip })),
    import('recharts').then(module => ({ default: module.ResponsiveContainer })),
    import('recharts').then(module => ({ default: module.LineChart })),
    import('recharts').then(module => ({ default: module.Line })),
    import('recharts').then(module => ({ default: module.PieChart })),
    import('recharts').then(module => ({ default: module.Pie })),
    import('recharts').then(module => ({ default: module.Cell }))
  ])

  return {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
  }
}