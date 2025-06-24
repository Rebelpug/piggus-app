import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TopNavigation, Text } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

type Guide = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  content: string;
  category: string;
};

const MOCK_GUIDES: Guide[] = [
  {
    id: '1',
    icon: 'wallet-outline',
    title: 'Setting Up Your Budget',
    subtitle: 'Learn how to create and manage your monthly budget effectively',
    category: 'Budgeting',
    content: `# Setting Up Your Budget

A well-planned budget is the foundation of good financial management. Here's how to set up your budget in the app:

## Step 1: Determine Your Income
Start by calculating your total monthly income from all sources:
- Salary (after taxes)
- Freelance work
- Investment returns
- Other income sources

## Step 2: Track Your Expenses
Monitor your spending for at least a month to understand your patterns:
- Fixed expenses (rent, utilities, insurance)
- Variable expenses (groceries, entertainment)
- Unexpected expenses

## Step 3: Set Budget Categories
Create categories that match your spending habits:
- Housing (25-30% of income)
- Transportation (10-15%)
- Food (10-15%)
- Savings (20% minimum)
- Entertainment (5-10%)

## Step 4: Use the 50/30/20 Rule
A simple budgeting framework:
- 50% for needs (essentials)
- 30% for wants (entertainment, dining out)
- 20% for savings and debt repayment

## Tips for Success
- Review your budget monthly
- Adjust categories as needed
- Use the app's tracking features
- Set realistic goals
- Don't be too strict - allow some flexibility

Remember, budgeting is a skill that improves with practice!`
  },
  {
    id: '2',
    icon: 'trending-up-outline',
    title: 'Investment Basics',
    subtitle: 'Understanding the fundamentals of investing and building wealth',
    category: 'Investing',
    content: `# Investment Basics

Investing is one of the most effective ways to build long-term wealth. Here's what you need to know to get started:

## What is Investing?
Investing means putting your money into assets that have the potential to grow in value over time, such as stocks, bonds, or real estate.

## Types of Investments

### Stocks
- Represent ownership in companies
- Potential for high returns but higher risk
- Best for long-term growth

### Bonds
- Loans to governments or corporations
- Lower risk, steady returns
- Good for income and stability

### ETFs (Exchange-Traded Funds)
- Diversified baskets of stocks or bonds
- Lower fees than mutual funds
- Great for beginners

### Real Estate
- Physical property or REITs
- Potential for income and appreciation
- Requires more capital

## Key Investment Principles

### 1. Start Early
Time is your biggest advantage due to compound interest.

### 2. Diversify
Don't put all eggs in one basket - spread risk across different assets.

### 3. Dollar-Cost Averaging
Invest a fixed amount regularly, regardless of market conditions.

### 4. Think Long-Term
Markets fluctuate, but historically trend upward over decades.

### 5. Keep Costs Low
High fees can significantly impact returns over time.

## Getting Started
1. Define your investment goals
2. Determine your risk tolerance
3. Choose appropriate investments
4. Start with small amounts
5. Track your portfolio in the app

Remember: investing involves risk, and it's important to do your research or consult with a financial advisor.`
  },
  {
    id: '3',
    icon: 'shield-checkmark-outline',
    title: 'Emergency Fund Guide',
    subtitle: 'Building a financial safety net for unexpected expenses',
    category: 'Savings',
    content: `# Emergency Fund Guide

An emergency fund is a crucial part of financial security. It's money set aside specifically for unexpected expenses or financial emergencies.

## Why You Need an Emergency Fund

### Financial Security
- Protects against job loss
- Covers unexpected medical bills
- Handles major home or car repairs
- Prevents debt accumulation

### Peace of Mind
- Reduces financial stress
- Allows better decision-making
- Provides flexibility in career choices

## How Much Should You Save?

### Starter Emergency Fund
- $1,000 minimum for beginners
- Covers small emergencies
- Better than nothing!

### Full Emergency Fund
- 3-6 months of living expenses
- 6-12 months if income is irregular
- Consider your job security and family situation

## Where to Keep Your Emergency Fund

### High-Yield Savings Account
- Easy access when needed
- Earns some interest
- FDIC insured

### Money Market Account
- Higher interest than regular savings
- May have check-writing privileges
- Still easily accessible

### What NOT to Use
- Investment accounts (too risky)
- Regular checking account (too tempting to spend)
- Cash at home (no interest, security risk)

## Building Your Emergency Fund

### 1. Set a Clear Goal
Determine exactly how much you need and by when.

### 2. Automate Savings
Set up automatic transfers to your emergency fund.

### 3. Start Small
Even $25 per week adds up over time.

### 4. Use Windfalls
Tax refunds, bonuses, and gifts can boost your fund quickly.

### 5. Track Progress
Use the app to monitor your savings growth.

## When to Use Your Emergency Fund

### True Emergencies
- Job loss
- Major medical expenses
- Essential home repairs
- Car repairs (if needed for work)

### NOT Emergencies
- Vacations
- Holiday gifts
- Wants vs. needs
- Planned expenses

## Replenishing Your Fund
If you use your emergency fund, make replenishing it a top priority. Return to your regular savings schedule as soon as possible.

Your emergency fund is your financial foundation - protect it and let it protect you!`
  },
  {
    id: '4',
    icon: 'card-outline',
    title: 'Managing Debt',
    subtitle: 'Strategies for paying off debt and improving your financial health',
    category: 'Debt Management',
    content: `# Managing Debt

Debt can be a useful financial tool, but it's important to manage it wisely to maintain good financial health.

## Types of Debt

### Good Debt
- Mortgages (builds equity)
- Student loans (invests in your future)
- Business loans (generates income)

### Bad Debt
- Credit card debt (high interest)
- Auto loans (depreciating asset)
- Payday loans (extremely high interest)

## Debt Repayment Strategies

### The Debt Snowball Method
1. List all debts from smallest to largest balance
2. Pay minimums on all debts
3. Put extra money toward the smallest debt
4. Once paid off, move to the next smallest
5. Repeat until debt-free

**Pros:** Quick wins boost motivation
**Cons:** May pay more interest overall

### The Debt Avalanche Method
1. List all debts from highest to lowest interest rate
2. Pay minimums on all debts
3. Put extra money toward the highest interest debt
4. Once paid off, move to the next highest rate
5. Repeat until debt-free

**Pros:** Saves the most money in interest
**Cons:** May take longer to see progress

### Debt Consolidation
Combine multiple debts into one loan with:
- Lower interest rate
- Single monthly payment
- Fixed repayment term

**Options:**
- Personal loan
- Balance transfer credit card
- Home equity loan (use caution)

## Credit Card Management

### Best Practices
- Pay full balance monthly
- Keep utilization below 30%
- Pay more than the minimum
- Avoid cash advances
- Monitor your credit report

### If You're Struggling
- Contact your credit card company
- Consider a payment plan
- Seek credit counseling
- Avoid debt settlement scams

## Creating a Debt Repayment Plan

### 1. List All Debts
Include:
- Creditor name
- Balance owed
- Interest rate
- Minimum payment
- Due date

### 2. Calculate Available Money
- Income minus essential expenses
- Look for areas to cut spending
- Consider increasing income

### 3. Choose Your Strategy
Pick either snowball or avalanche method based on your personality and situation.

### 4. Track Progress
Use the app to monitor your debt reduction progress.

### 5. Stay Motivated
- Celebrate milestones
- Visualize being debt-free
- Consider the financial freedom you'll gain

## Preventing Future Debt Problems

### Budget Properly
- Live below your means
- Build an emergency fund
- Plan for large expenses

### Use Credit Wisely
- Only charge what you can afford to pay off
- Understand terms and conditions
- Limit the number of credit cards

### Increase Financial Literacy
- Continue learning about personal finance
- Understand the true cost of debt
- Make informed financial decisions

Remember: getting out of debt takes time and discipline, but the financial freedom is worth the effort!`
  },
  {
    id: '5',
    icon: 'pie-chart-outline',
    title: 'Portfolio Diversification',
    subtitle: 'Learn how to spread risk across different investment types',
    category: 'Investing',
    content: `# Portfolio Diversification

Diversification is a risk management strategy that involves spreading investments across various assets to reduce overall portfolio risk.

## What is Diversification?

Diversification means not putting all your eggs in one basket. By spreading investments across different:
- Asset classes (stocks, bonds, real estate)
- Geographic regions (domestic, international)
- Industries and sectors
- Company sizes (large-cap, small-cap)

You reduce the risk that a single investment's poor performance will significantly impact your entire portfolio.

## Types of Diversification

### Asset Class Diversification
**Stocks**
- Growth potential but higher volatility
- Different sectors perform differently

**Bonds**
- More stable, provide income
- Government vs. corporate bonds

**Real Estate**
- REITs or direct property ownership
- Often performs differently than stocks

**Commodities**
- Gold, oil, agricultural products
- Hedge against inflation

### Geographic Diversification
**Domestic Investments**
- Familiar markets and regulations
- Home currency advantage

**International Developed Markets**
- Exposure to other stable economies
- Currency diversification

**Emerging Markets**
- Higher growth potential
- Higher risk and volatility

### Sector Diversification
Spread investments across:
- Technology
- Healthcare
- Financial services
- Consumer goods
- Energy
- Utilities
- Real estate

## How Much Diversification?

### Age-Based Allocation
**Young Investors (20s-30s)**
- 80-90% stocks
- 10-20% bonds
- High risk tolerance, long time horizon

**Middle-Aged (40s-50s)**
- 60-70% stocks
- 30-40% bonds
- Moderate risk, building toward retirement

**Near/In Retirement (60s+)**
- 40-60% stocks
- 40-60% bonds
- Lower risk, need stability

### Target Date Funds
Automatically adjust allocation based on retirement date:
- Start aggressive when young
- Become conservative as retirement approaches
- Simple, hands-off approach

## Building a Diversified Portfolio

### Step 1: Determine Asset Allocation
Based on:
- Age and time horizon
- Risk tolerance
- Financial goals
- Income needs

### Step 2: Choose Investment Vehicles
**Individual Stocks and Bonds**
- More control but requires research
- Higher costs and time commitment

**Mutual Funds**
- Professional management
- Instant diversification
- Higher fees

**ETFs (Exchange-Traded Funds)**
- Lower fees than mutual funds
- Trade like stocks
- Wide variety available

**Index Funds**
- Track market indices
- Very low fees
- Broad market exposure

### Step 3: Implement Your Strategy
- Start with broad market funds
- Add specific sectors or regions gradually
- Rebalance periodically

## Common Diversification Mistakes

### Over-Diversification
- Too many similar investments
- Excessive fees and complexity
- Diluted returns

### Under-Diversification
- Too concentrated in one area
- Excessive risk
- Missing opportunities

### Home Country Bias
- Over-investing in domestic markets
- Missing international opportunities
- Currency concentration

### Chasing Performance
- Constantly changing allocation
- Buying high, selling low
- Increased transaction costs

## Rebalancing Your Portfolio

### Why Rebalance?
- Maintain desired asset allocation
- Force selling high, buying low
- Control risk levels

### When to Rebalance
**Time-Based**
- Quarterly or annually
- Simple and systematic

**Threshold-Based**
- When allocation drifts 5-10% from target
- More responsive to market changes

### How to Rebalance
1. Calculate current allocation
2. Compare to target allocation
3. Sell overweight assets
4. Buy underweight assets
5. Consider tax implications

## Tracking Your Diversification

Use the app to:
- Monitor asset allocation
- Track performance by category
- Set rebalancing reminders
- Analyze risk exposure

Remember: diversification doesn't guarantee profits or protect against losses, but it's one of the most important tools for managing investment risk!`
  },
  {
    id: '6',
    icon: 'calculator-outline',
    title: 'Tax Planning Basics',
    subtitle: 'Strategies to minimize taxes and maximize your savings',
    category: 'Tax Planning',
    content: `# Tax Planning Basics

Effective tax planning can save you thousands of dollars and help you keep more of your hard-earned money.

## Understanding Tax Brackets

### Progressive Tax System
- Higher income = higher tax rate on additional income
- Only income above each bracket threshold is taxed at that rate
- Lower income is always taxed at lower rates

### 2024 Tax Brackets (Single Filers)
- 10%: $0 - $11,000
- 12%: $11,001 - $44,725
- 22%: $44,726 - $95,375
- 24%: $95,376 - $182,050
- 32%: $182,051 - $231,250
- 35%: $231,251 - $578,125
- 37%: $578,126+

*Note: Brackets adjust annually for inflation*

## Tax-Advantaged Accounts

### Retirement Accounts

**401(k) Plans**
- Employer-sponsored
- Traditional: Pre-tax contributions, taxed in retirement
- Roth: After-tax contributions, tax-free in retirement
- 2024 contribution limit: $23,000 ($30,500 if 50+)

**IRA (Individual Retirement Account)**
- Traditional: Tax-deductible contributions, taxed in retirement
- Roth: After-tax contributions, tax-free growth and withdrawals
- 2024 contribution limit: $7,000 ($8,000 if 50+)

### Health Savings Account (HSA)
- Triple tax advantage: deductible, grows tax-free, withdrawals tax-free for medical expenses
- High-deductible health plan required
- 2024 contribution limit: $4,150 individual, $8,300 family

### 529 Education Savings Plan
- Tax-free growth for education expenses
- State tax deductions in many states
- Can be used for K-12 tuition and college

## Tax Deductions vs. Credits

### Deductions
Reduce your taxable income:
- Standard deduction: $14,600 single, $29,200 married (2024)
- Itemized deductions: mortgage interest, state taxes, charitable donations
- Above-the-line deductions: student loan interest, educator expenses

### Credits
Reduce your tax owed dollar-for-dollar:
- Child Tax Credit: Up to $2,000 per child
- Earned Income Tax Credit: For lower-income earners
- Education credits: American Opportunity, Lifetime Learning

## Common Tax Planning Strategies

### Income Timing
**Defer Income**
- Maximize 401(k) contributions
- Delay year-end bonuses
- Time investment sales

**Accelerate Deductions**
- Bunch charitable donations
- Prepay state taxes (if beneficial)
- Accelerate business expenses

### Tax-Loss Harvesting
- Sell losing investments to offset gains
- Reduce taxable income
- Be aware of wash sale rules

### Asset Location
**Tax-Efficient Placement**
- Hold tax-inefficient investments in tax-advantaged accounts
- Keep tax-efficient investments in taxable accounts
- Consider municipal bonds for high earners

### Charitable Giving
**Tax Benefits**
- Deduct donations to qualified charities
- Donate appreciated assets to avoid capital gains
- Consider donor-advised funds

**Qualified Charitable Distribution**
- Direct transfer from IRA to charity (age 70½+)
- Counts toward required minimum distribution
- Excluded from taxable income

## Year-End Tax Planning

### December Checklist
- Review tax-loss harvesting opportunities
- Maximize retirement contributions
- Consider Roth conversions
- Bunch deductions if beneficial
- Review beneficiary designations

### Business Owners
- Purchase business equipment
- Defer income to next year
- Accelerate business expenses
- Consider retirement plan contributions

## Record Keeping

### Important Documents
- W-2s and 1099s
- Receipts for deductible expenses
- Investment statements
- Charitable donation receipts
- Business expense records

### Digital Organization
- Use apps to track expenses
- Take photos of receipts
- Maintain separate business accounts
- Keep records for at least 3 years

## Working with Tax Professionals

### When to Consider Help
- Complex financial situation
- Business ownership
- Significant life changes
- Large capital gains or losses

### Types of Tax Professionals
**CPA (Certified Public Accountant)**
- Highest credential
- Can represent you before IRS
- Comprehensive tax planning

**Enrolled Agent**
- IRS-licensed tax professional
- Specializes in tax issues
- Can represent you before IRS

**Tax Preparer**
- May not have formal credentials
- Generally less expensive
- Good for simple returns

## Common Tax Mistakes to Avoid

- Not keeping good records
- Missing deadlines
- Forgetting to sign returns
- Not reporting all income
- Claiming inappropriate deductions
- Not planning ahead

## Tax Software and Tools

### Popular Options
- TurboTax
- H&R Block
- FreeTaxUSA
- IRS Free File (for eligible taxpayers)

### Features to Look For
- Import from financial institutions
- Error checking
- Maximum refund guarantee
- Audit support

Remember: tax laws change frequently, so stay informed and consider professional help for complex situations. The key to effective tax planning is starting early and being proactive throughout the year!`
  }
];

export default function GuidesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleGuidePress = (guide: Guide) => {
    router.push({
      pathname: '/(protected)/guide-detail',
      params: { 
        id: guide.id,
        title: guide.title,
        content: guide.content 
      }
    });
  };

  const renderGuideItem = (guide: Guide) => (
    <TouchableOpacity
      key={guide.id}
      style={[styles.guideItem, { backgroundColor: colors.card, shadowColor: colors.text }]}
      onPress={() => handleGuidePress(guide)}
    >
      <View style={[styles.guideIcon, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name={guide.icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.guideContent}>
        <View style={styles.guideHeader}>
          <Text style={[styles.guideCategory, { color: colors.primary }]}>
            {guide.category}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.icon} />
        </View>
        <Text style={[styles.guideTitle, { color: colors.text }]}>
          {guide.title}
        </Text>
        <Text style={[styles.guideSubtitle, { color: colors.icon }]}>
          {guide.subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavigation
        title='Financial Guides'
        alignment='center'
        style={{ backgroundColor: colors.background }}
      />
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Learn & Grow
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
            Master your finances with our comprehensive guides
          </Text>
        </View>

        <View style={styles.guidesContainer}>
          {MOCK_GUIDES.map(renderGuideItem)}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  header: {
    paddingVertical: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  guidesContainer: {
    gap: 16,
  },
  guideItem: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  guideIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  guideContent: {
    flex: 1,
  },
  guideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  guideCategory: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  guideSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
});