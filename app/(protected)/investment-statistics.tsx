import * as React from 'react';
import { useMemo, useState } from 'react';
import { StyleSheet, ScrollView, View, Dimensions, TouchableOpacity } from 'react-native';
import { Text, TopNavigation, TopNavigationAction, Modal, Card, Layout, Button } from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInvestment } from '@/context/InvestmentContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLocalization } from '@/context/LocalizationContext';
import { Colors } from '@/constants/Colors';
import Svg, { Path, Circle, Polyline, Line, Text as SvgText } from 'react-native-svg';
import { useProfile } from "@/context/ProfileContext";
import { formatCurrency } from "@/utils/currencyUtils";
import { calculateInvestmentStatistics, InvestmentStats, generateProjectionData } from "@/utils/financeUtils";

const { width } = Dimensions.get('window');

// Custom SVG Pie Chart Component
interface PieChartProps {
  data: PieChartData[];
  size: number;
  colors: any;
}

// Custom SVG Line Chart Component for 10-year projection
interface LineChartProps {
  data: { year: number; value: number }[];
  size: { width: number; height: number };
  colors: any;
}

const CustomLineChart: React.FC<LineChartProps> = ({ data, size, colors }) => {
  const padding = 40;
  const chartWidth = size.width - (padding * 2);
  const chartHeight = size.height - (padding * 2);

  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const valueRange = maxValue - minValue;

  // Create points for the line
  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  // Create area under the curve
  const areaPoints = [
    `${padding},${padding + chartHeight}`, // Start from bottom left
    ...data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
      return `${x},${y}`;
    }),
    `${padding + chartWidth},${padding + chartHeight}` // End at bottom right
  ].join(' ');

  return (
    <Svg width={size.width} height={size.height}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
        <Line
          key={`grid-${index}`}
          x1={padding}
          y1={padding + chartHeight * ratio}
          x2={padding + chartWidth}
          y2={padding + chartHeight * ratio}
          stroke={colors.border}
          strokeWidth={1}
          opacity={0.3}
        />
      ))}

      {/* Area under curve */}
      <Path
        d={`M ${areaPoints} Z`}
        fill={colors.primary}
        fillOpacity={0.1}
      />

      {/* Main line */}
      <Polyline
        points={points}
        fill="none"
        stroke={colors.primary}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {data.map((point, index) => {
        const x = padding + (index / (data.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
        return (
          <Circle
            key={index}
            cx={x}
            cy={y}
            r={4}
            fill={colors.primary}
            stroke={colors.background}
            strokeWidth={2}
          />
        );
      })}

      {/* Year labels */}
      {data.map((point, index) => {
        if (index % 2 === 0 || index === data.length - 1) { // Show every other year + last year
          const x = padding + (index / (data.length - 1)) * chartWidth;
          return (
            <SvgText
              key={`year-${index}`}
              x={x}
              y={size.height - 10}
              fontSize="12"
              fill={colors.icon}
              textAnchor="middle"
            >
              {point.year}
            </SvgText>
          );
        }
        return null;
      })}
    </Svg>
  );
};

const CustomPieChart: React.FC<PieChartProps> = ({ data, size, colors }) => {
  const radius = size / 2 - 20;
  const centerX = size / 2;
  const centerY = size / 2;

  let slices: React.ReactNode[] = [];

  if (data.length === 0) {
    return null;
  } else if (data.length === 1) {
    // If only one item then draw the full circle
    slices = [
      <Circle
          key="full"
          cx={centerX}
          cy={centerY}
          r={radius}
          fill={data[0].color}
          stroke={colors.background}
          strokeWidth={2}
      />
    ];
  } else {
    let cumulativePercentage = 0;
    slices = data.map((item, index) => {
      const percentage = item.value;
      const startAngle = (cumulativePercentage / 100) * 360;
      const endAngle = ((cumulativePercentage + percentage) / 100) * 360;

      cumulativePercentage += percentage;

      const startAngleRad = ((startAngle - 90) * Math.PI) / 180;
      const endAngleRad = ((endAngle - 90) * Math.PI) / 180;

      const x1 = centerX + radius * Math.cos(startAngleRad);
      const y1 = centerY + radius * Math.sin(startAngleRad);
      const x2 = centerX + radius * Math.cos(endAngleRad);
      const y2 = centerY + radius * Math.sin(endAngleRad);

      const largeArcFlag = percentage > 50 ? 1 : 0;

      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      return (
          <Path
              key={index}
              d={pathData}
              fill={item.color}
              stroke={colors.background}
              strokeWidth={2}
          />
      );
    });
  }

  return (
    <Svg width={size} height={size}>
      {slices}
      <Circle
        cx={centerX}
        cy={centerY}
        r={radius * 0.3}
        fill={colors.background}
      />
    </Svg>
  );
};

interface PieChartData {
  label: string;
  value: number;
  color: string;
}


const investmentTypes = [
  { id: 'stock', name: 'Stock', icon: '📈' },
  { id: 'bond', name: 'Bond', icon: '🏛️' },
  { id: 'crypto', name: 'Cryptocurrency', icon: '₿' },
  { id: 'etf', name: 'ETF', icon: '📊' },
  { id: 'mutual_fund', name: 'Mutual Fund', icon: '🏦' },
  { id: 'real_estate', name: 'Real Estate', icon: '🏠' },
  { id: 'commodity', name: 'Commodity', icon: '🥇' },
  { id: 'checkingAccount', name: 'Checking Account', icon: '💳' },
  { id: 'savingsAccount', name: 'Savings Account', icon: '💰' },
  { id: 'other', name: 'Other', icon: '📦' },
];


export default function InvestmentStatisticsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme || 'light'];
  const { userProfile } = useProfile();
  const { t } = useLocalization();
  const { portfolioId } = useLocalSearchParams<{ portfolioId?: string }>();
  const { portfolios } = useInvestment();

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(portfolioId || null);
  const [portfolioModalVisible, setPortfolioModalVisible] = useState(false);

  // Get available portfolios
  const availablePortfolios = useMemo(() => {
    return portfolios.filter(p => p.membership_status === 'confirmed');
  }, [portfolios]);

  // Get selected portfolio or all portfolios data
  const selectedPortfolio = useMemo(() => {
    if (selectedPortfolioId) {
      return portfolios.find(p => p.id === selectedPortfolioId);
    }
    return null;
  }, [portfolios, selectedPortfolioId]);

  const renderBackAction = () => (
    <TopNavigationAction
      icon={(props) => <Ionicons name="chevron-back" size={24} color={colors.text} />}
      onPress={() => router.back()}
    />
  );

  // Calculate investment statistics
  const investmentStats: InvestmentStats = useMemo(() => {
    let investments: any[] = [];

    if (!portfolios?.length) {
      return calculateInvestmentStatistics([]);
    }

    if (selectedPortfolio) {
      investments = selectedPortfolio.investments || [];
    } else {
      // Aggregate all investments from all portfolios
      investments = portfolios.reduce((acc, portfolio) => {
        if (portfolio.membership_status === 'confirmed') {
          return [...acc, ...(portfolio.investments || [])];
        }
        return acc;
      }, [] as any[]);
    }

    return calculateInvestmentStatistics(investments);
  }, [portfolios, selectedPortfolio]);

  // Create pie chart data for investment types
  const typesPieData: PieChartData[] = useMemo(() => {
    if (!investmentStats?.typeBreakdown || investmentStats.totalValue === 0) {
      return [];
    }

    const typeColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];

    return Object.entries(investmentStats.typeBreakdown)
      .map(([type, data], index) => {
        const percentage = investmentStats.totalValue > 0 ? (data.value / investmentStats.totalValue) * 100 : 0;
        const typeInfo = investmentTypes.find(t => t.id === type);

        return {
          label: `${typeInfo?.icon || '📦'} ${typeInfo?.name || type}`,
          value: percentage,
          color: typeColors[index % typeColors.length]
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [investmentStats]);

  // Create line chart data for 10-year projection using yearly return composition
  const projectionLineData: { year: number; value: number }[] = useMemo(() => {
    if (!investmentStats?.totalValue) {
      return [];
    }

    return generateProjectionData(
      investmentStats.totalValue,
      investmentStats.estimatedYearlyGainLossPercentage / 100,
      10
    );
  }, [investmentStats]);

  const getProgressWidth = (amount: number, maxAmount: number) => {
    if (maxAmount === 0) return 0;
    return Math.min((amount / maxAmount) * 100, 100);
  };

  const maxTypeValue = Math.max(...Object.values(investmentStats.typeBreakdown).map(t => t.value), 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavigation
        title={t('investmentStatistics.title')}
        alignment="center"
        accessoryLeft={renderBackAction}
        style={{ backgroundColor: colors.background }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Portfolio Selector */}
        {availablePortfolios.length > 1 && (
          <View style={styles.filterSection}>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setPortfolioModalVisible(true)}
            >
              <Text style={[styles.filterButtonText, { color: colors.text }]}>
                {selectedPortfolio ? selectedPortfolio.data?.name : t('investmentStatistics.allPortfolios')}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.icon} />
            </TouchableOpacity>
          </View>
        )}

        {/* Overview Section */}
        <View style={styles.summarySection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('investmentStatistics.overview')}</Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(investmentStats.totalValue, userProfile?.profile.defaultCurrency)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>{t('investmentStatistics.currentValue')}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: investmentStats.totalGainLoss >= 0 ? colors.success : colors.error }]}>
                {investmentStats.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(investmentStats.totalGainLoss, userProfile?.profile.defaultCurrency)}
              </Text>
              <Text style={[styles.statPercentage, { color: investmentStats.totalGainLoss >= 0 ? colors.success : colors.error }]}>
                {investmentStats.totalGainLossPercentage >= 0 ? '+' : ''}{investmentStats.totalGainLossPercentage.toFixed(2)}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>{t('investmentStatistics.totalReturn')}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: investmentStats.estimatedYearlyGainLoss >= 0 ? colors.success : colors.error }]}>
                {investmentStats.estimatedYearlyGainLoss >= 0 ? '+' : ''}{formatCurrency(investmentStats.estimatedYearlyGainLoss, userProfile?.profile?.defaultCurrency)}
              </Text>
              <Text style={[styles.statPercentage, { color: investmentStats.estimatedYearlyGainLoss >= 0 ? colors.success : colors.error }]}>
                {investmentStats.estimatedYearlyGainLoss >= 0 ? '+' : ''}{investmentStats.estimatedYearlyGainLossPercentage.toFixed(2)}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>{t('investmentStatistics.estimatedYearlyGainLoss')}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {formatCurrency(investmentStats.dividendsInterestEarned, userProfile?.profile?.defaultCurrency)}
              </Text>
              <Text style={[styles.statPercentage, { color: colors.success }]}>
                {investmentStats.dividendsInterestEarnedPercentage.toFixed(2)}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>{t('investmentStatistics.dividendsInterestEarned')}</Text>
            </View>
          </View>
        </View>

        {/* Investment Types Distribution */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('investmentStatistics.investmentTypes')}</Text>

          {typesPieData.length > 0 && (
            <View style={styles.pieChartSection}>
              <CustomPieChart
                data={typesPieData}
                size={280}
                colors={colors}
              />

              {/* Custom Legend */}
              <View style={styles.pieChartLegend}>
                {typesPieData.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendColorBox,
                        { backgroundColor: item.color }
                      ]}
                    />
                    <Text style={[styles.legendText, { color: colors.text }]}>
                      {item.label} ({item.value.toFixed(1)}%)
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 10-Year Projection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('investmentStatistics.tenYearProjection')}</Text>

          <View style={[styles.projectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.projectionHeader}>
              <Text style={[styles.projectionValue, { color: colors.primary }]}>
                {formatCurrency(investmentStats.projectedValue10Years, userProfile?.profile.defaultCurrency)}
              </Text>
              <Text style={[styles.projectionLabel, { color: colors.icon }]}>
                {t('investmentStatistics.projectedValueTenYears')}
              </Text>
            </View>

            {projectionLineData.length > 0 && (
              <View style={styles.projectionChartSection}>
                <CustomLineChart
                  data={projectionLineData}
                  size={{ width: width - 80, height: 200 }}
                  colors={colors}
                />

                <View style={styles.projectionStats}>
                  <View style={styles.projectionStatItem}>
                    <Text style={[styles.projectionStatValue, { color: colors.success }]}>
                      {formatCurrency(projectionLineData[0]?.value || 0, userProfile?.profile.defaultCurrency)}
                    </Text>
                    <Text style={[styles.projectionStatLabel, { color: colors.icon }]}>
                      {t('investmentStatistics.currentValue')}
                    </Text>
                  </View>
                  <View style={styles.projectionStatItem}>
                    <Text style={[styles.projectionStatValue, { color: colors.primary }]}>
                      {formatCurrency(projectionLineData[projectionLineData.length - 1]?.value || 0, userProfile?.profile.defaultCurrency)}
                    </Text>
                    <Text style={[styles.projectionStatLabel, { color: colors.icon }]}>
                      {t('investmentStatistics.projectedTenYears')}
                    </Text>
                  </View>
                  <View style={styles.projectionStatItem}>
                    <Text style={[styles.projectionStatValue, { color: colors.warning }]}>
                      {formatCurrency((projectionLineData[projectionLineData.length - 1]?.value || 0) - (projectionLineData[0]?.value || 0), userProfile?.profile.defaultCurrency)}
                    </Text>
                    <Text style={[styles.projectionStatLabel, { color: colors.icon }]}>
                      {t('investmentStatistics.potentialGains')}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <Text style={[styles.projectionDisclaimer, { color: colors.icon }]}>
              {t('investmentStatistics.projectionDisclaimer')}
            </Text>
          </View>
        </View>

        {/* Type Breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('investmentStatistics.detailedBreakdown')}</Text>
          <View style={[styles.typeContainer, { backgroundColor: colors.card }]}>
            {Object.entries(investmentStats.typeBreakdown).map(([type, data]) => {
              const typeInfo = investmentTypes.find(t => t.id === type);
              const percentage = investmentStats.totalValue > 0 ? (data.value / investmentStats.totalValue) * 100 : 0;

              return (
                <View key={type} style={styles.typeItem}>
                  <View style={styles.typeHeader}>
                    <View style={styles.typeInfo}>
                      <Text style={styles.typeIcon}>{typeInfo?.icon || '📦'}</Text>
                      <Text style={[styles.typeName, { color: colors.text }]}>
                        {typeInfo?.name || type}
                      </Text>
                    </View>
                    <View style={styles.typeAmounts}>
                      <Text style={[styles.typeAmount, { color: colors.text }]}>
                        {formatCurrency(data.value, userProfile?.profile.defaultCurrency)}
                      </Text>
                      <Text style={[styles.typePercentage, { color: colors.icon }]}>
                        {percentage.toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.typeProgress}>
                    <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${getProgressWidth(data.value, maxTypeValue)}%`,
                            backgroundColor: data.gainLoss >= 0 ? colors.success : colors.error
                          }
                        ]}
                      />
                    </View>
                    <Text style={[styles.typeCount, { color: colors.icon }]}>
                      {data.count} {t('investmentStatistics.investmentsCount')} • {data.gainLoss >= 0 ? '+' : ''}{formatCurrency(data.gainLoss, userProfile?.profile.defaultCurrency)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Portfolio Selection Modal */}
      <Modal
        visible={portfolioModalVisible}
        backdropStyle={styles.backdrop}
        onBackdropPress={() => setPortfolioModalVisible(false)}
      >
        <Card disabled={true} style={styles.modalCard}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{t('investmentStatistics.selectPortfolio')}</Text>

          <View style={styles.portfolioOptions}>
            <TouchableOpacity
              style={[
                styles.portfolioOption,
                { backgroundColor: colors.background, borderColor: colors.border },
                !selectedPortfolioId && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
              ]}
              onPress={() => {
                setSelectedPortfolioId(null);
                setPortfolioModalVisible(false);
              }}
            >
              <Text style={[styles.portfolioOptionText, { color: colors.text }]}>{t('investmentStatistics.allPortfolios')}</Text>
            </TouchableOpacity>

            {availablePortfolios.map(portfolio => (
              <TouchableOpacity
                key={portfolio.id}
                style={[
                  styles.portfolioOption,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  selectedPortfolioId === portfolio.id && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                ]}
                onPress={() => {
                  setSelectedPortfolioId(portfolio.id);
                  setPortfolioModalVisible(false);
                }}
              >
                <Text style={[styles.portfolioOptionText, { color: colors.text }]}>
                  {portfolio.data?.name || t('investmentStatistics.unnamedPortfolio')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Layout style={styles.modalActions}>
            <Button
              style={styles.modalButton}
              appearance="outline"
              onPress={() => setPortfolioModalVisible(false)}
            >
              {t('investmentStatistics.cancel')}
            </Button>
          </Layout>
        </Card>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  summarySection: {
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statPercentage: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  pieChartSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  pieChartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 10,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  legendColorBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  projectionCard: {
    borderRadius: 16,
    padding: 20,
  },
  projectionHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  projectionValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  projectionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  projectionChartSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  projectionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 10,
  },
  projectionStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  projectionStatValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  projectionStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  projectionDisclaimer: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  typeContainer: {
    borderRadius: 16,
    padding: 16,
  },
  typeItem: {
    marginBottom: 20,
  },
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  typeName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  typeAmounts: {
    alignItems: 'flex-end',
  },
  typeAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  typePercentage: {
    fontSize: 12,
    fontWeight: '500',
  },
  typeProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    flex: 1,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  typeCount: {
    fontSize: 10,
    fontWeight: '500',
    minWidth: 120,
    textAlign: 'right',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalCard: {
    minWidth: 320,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  portfolioOptions: {
    gap: 12,
    marginBottom: 16,
  },
  portfolioOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  portfolioOptionText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
  },
});
