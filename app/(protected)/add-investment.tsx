import React, { useState, useMemo } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Button,
  Datepicker,
  IndexPath,
  Input,
  Select,
  SelectItem,
  Spinner,
  Text,
  TopNavigation,
} from "@ui-kitten/components";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useInvestment } from "@/context/InvestmentContext";
import { useProfile } from "@/context/ProfileContext";
import {
  INVESTMENT_TYPES,
  InvestmentData,
  InvestmentLookupResultV2,
} from "@/types/investment";
import { apiSearchSymbolsWithQuotes } from "@/services/investmentService";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { ThemedView } from "@/components/ThemedView";
import { useLocalization } from "@/context/LocalizationContext";
import {
  calculateIndividualInvestmentReturns,
  InvestmentStats,
} from "@/utils/financeUtils";
import {
  formatStringWithoutSpacesAndSpecialChars,
  normalizeDecimalForParsing,
} from "@/utils/stringUtils";

const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "CNY"];

export default function AddInvestmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { portfolios, addInvestment } = useInvestment();
  const { userProfile } = useProfile();
  const { t } = useLocalization();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string>("");
  const [searchResults, setSearchResults] = useState<
    InvestmentLookupResultV2[]
  >([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Get user's default currency and find its index
  const userDefaultCurrency = userProfile?.profile?.defaultCurrency || "EUR";
  const defaultCurrencyIndex = currencies.findIndex(
    (c) => c === userDefaultCurrency,
  );
  const initialCurrencyIndex =
    defaultCurrencyIndex >= 0 ? defaultCurrencyIndex : 0;

  // Form state - Check if portfolioId is passed as parameter
  const getInitialPortfolioIndex = () => {
    const portfolioId = params.portfolioId as string;
    if (portfolioId) {
      const portfolioIndex = portfolios.findIndex((p) => p.id === portfolioId);
      if (portfolioIndex >= 0) {
        return new IndexPath(portfolioIndex);
      }
    }
    return new IndexPath(0);
  };

  const [selectedPortfolioIndex, setSelectedPortfolioIndex] =
    useState<IndexPath>(getInitialPortfolioIndex());
  const [selectedTypeIndex, setSelectedTypeIndex] = useState<IndexPath>(
    new IndexPath(0),
  );
  const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<IndexPath>(
    new IndexPath(initialCurrencyIndex),
  );

  const [formData, setFormData] = useState({
    isin: "",
    name: "",
    symbol: "",
    exchange_market: "",
    quantity: "",
    purchase_price: "",
    current_price: "",
    taxation: "",
    purchase_date: new Date(),
    notes: "",
    interest_rate: "",
    maturity_date: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years from now
  });

  const [searchQuery, setSearchQuery] = useState("");

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const selectedPortfolio = portfolios[selectedPortfolioIndex.row];
  const selectedType = INVESTMENT_TYPES[selectedTypeIndex.row];
  const selectedTypeName = selectedType
    ? t(`investmentTypes.${selectedType.id}`)
    : "";
  const selectedCurrency = currencies[selectedCurrencyIndex.row];

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = t("addInvestment.investmentNameRequired");
    }

    if (!formData.quantity.trim()) {
      newErrors.quantity = t("addInvestment.quantityRequired");
    } else if (
      isNaN(Number(normalizeDecimalForParsing(formData.quantity))) ||
      Number(normalizeDecimalForParsing(formData.quantity)) <= 0
    ) {
      newErrors.quantity = t("addInvestment.quantityPositive");
    }

    if (!formData.purchase_price.trim()) {
      newErrors.purchase_price = t("addInvestment.purchasePriceRequired");
    } else if (
      isNaN(Number(normalizeDecimalForParsing(formData.purchase_price))) ||
      Number(normalizeDecimalForParsing(formData.purchase_price)) <= 0
    ) {
      newErrors.purchase_price = t("addInvestment.purchasePricePositive");
    }

    if (
      formData.current_price &&
      (isNaN(Number(normalizeDecimalForParsing(formData.current_price))) ||
        Number(normalizeDecimalForParsing(formData.current_price)) <= 0)
    ) {
      newErrors.current_price = t("addInvestment.currentPricePositive");
    }

    if (
      formData.taxation &&
      (isNaN(Number(normalizeDecimalForParsing(formData.taxation))) ||
        Number(normalizeDecimalForParsing(formData.taxation)) < 0 ||
        Number(normalizeDecimalForParsing(formData.taxation)) > 100)
    ) {
      newErrors.taxation = t("addInvestment.taxationValidRange");
    }

    if (
      formData.interest_rate &&
      (isNaN(Number(normalizeDecimalForParsing(formData.interest_rate))) ||
        Number(normalizeDecimalForParsing(formData.interest_rate)) < 0)
    ) {
      newErrors.interest_rate = t("addInvestment.interestRateValidRange");
    }

    if (
      selectedType.id === "bond" &&
      formData.maturity_date &&
      formData.maturity_date <= formData.purchase_date
    ) {
      newErrors.maturity_date = t("addInvestment.maturityDateAfterPurchase");
    }

    if (!selectedPortfolio) {
      newErrors.portfolio = t("addInvestment.selectPortfolioRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInvestmentSearch = async () => {
    if (!searchQuery.trim()) {
      setLookupError(
        t(
          "addInvestment.enterSymbolOrIsinToSearch",
          "Please enter a symbol or ISIN to search",
        ),
      );
      return;
    }

    setIsSearching(true);
    setLookupError("");
    setSearchResults([]);

    try {
      const response = await apiSearchSymbolsWithQuotes(
        searchQuery.trim().toUpperCase(),
      );

      if (response.success && response.data) {
        if (!response.data || response.data.length === 0) {
          setLookupError(
            t(
              "addInvestment.noInvestmentsFound",
              "No investments found for the given symbol or ISIN",
            ),
          );
        } else {
          setSearchResults(response.data);
          setShowSearchResults(true);
        }
      } else {
        setLookupError(
          response.error ||
            t(
              "addInvestment.failedToSearch",
              "Failed to search for investments",
            ),
        );
      }
    } catch (error) {
      console.error("Investment search error:", error);
      setLookupError(
        t(
          "addInvestment.unexpectedSearchError",
          "An unexpected error occurred during search",
        ),
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: InvestmentLookupResultV2) => {
    setFormData((prev) => ({
      ...prev,
      name: result.name,
      symbol: result.symbol,
      isin: result.isin,
      exchange_market: result.exchange,
      current_price: result.price || "",
      purchase_price: result.price || "",
      currency: result.currency,
    }));

    // Update currency selection if it exists in our list
    const currencyIndex = currencies.findIndex((c) => c === result.currency);
    if (currencyIndex >= 0) {
      setSelectedCurrencyIndex(new IndexPath(currencyIndex));
    }

    setSearchQuery(""); // Clear search query
    setShowSearchResults(false);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const investmentData: InvestmentData = {
        name: formData.name.trim(),
        symbol: formData.symbol.trim() || null,
        type: selectedType.id,
        isin: formatStringWithoutSpacesAndSpecialChars(
          formData.isin,
        ).toUpperCase(),
        exchange_market: formData.exchange_market.trim() || undefined,
        quantity: Number(normalizeDecimalForParsing(formData.quantity)),
        purchase_price: Number(
          normalizeDecimalForParsing(formData.purchase_price),
        ),
        current_price: formData.current_price
          ? Number(normalizeDecimalForParsing(formData.current_price))
          : Number(normalizeDecimalForParsing(formData.purchase_price)),
        purchase_date: formData.purchase_date.toISOString(),
        currency: selectedCurrency,
        notes: formData.notes.trim() || null,
        last_updated: new Date().toISOString(),
        last_tentative_update: new Date().toISOString(),
        interest_rate: formData.interest_rate
          ? Number(normalizeDecimalForParsing(formData.interest_rate))
          : null,
        maturity_date:
          selectedType.id === "bond" && formData.maturity_date
            ? formData.maturity_date.toISOString()
            : null,
        taxation: formData.taxation
          ? Number(normalizeDecimalForParsing(formData.taxation))
          : 0,
      };

      const result = await addInvestment(selectedPortfolio.id, investmentData);

      if (result) {
        router.back();
      } else {
        Alert.alert(
          t("addInvestment.error"),
          t("addInvestment.addInvestmentFailed"),
        );
      }
    } catch (error) {
      console.error("Error adding investment:", error);
      Alert.alert(t("addInvestment.error"), t("addInvestment.unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBackAction = () => (
    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={colors.icon} />
    </TouchableOpacity>
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: selectedCurrency,
    }).format(amount);
  };

  const investmentReturns = useMemo(() => {
    if (
      !formData.quantity ||
      !formData.purchase_price ||
      !formData.purchase_date
    ) {
      return {
        totalValue: 0,
        totalInvested: 0,
        totalGainLoss: 0,
        totalGainLossPercentage: 0,
        dividendsInterestEarned: 0,
        dividendsInterestEarnedPercentage: 0,
        estimatedYearlyGainLoss: 0,
        estimatedYearlyGainLossPercentage: 0,
        projectedValue10Years: 0,
        investmentCount: 0,
        averageValue: 0,
        typeBreakdown: {},
      } as InvestmentStats;
    }

    const quantity = Number(normalizeDecimalForParsing(formData.quantity));
    const purchasePrice = Number(
      normalizeDecimalForParsing(formData.purchase_price),
    );
    const currentPrice =
      Number(normalizeDecimalForParsing(formData.current_price)) ||
      purchasePrice;

    const investmentData = {
      id: "temp",
      data: {
        name: formData.name,
        isin: formatStringWithoutSpacesAndSpecialChars(
          formData.isin,
        ).toUpperCase(),
        type: selectedType.id,
        quantity: quantity,
        purchase_price: purchasePrice,
        current_price: currentPrice,
        purchase_date: formData.purchase_date.toISOString().split("T")[0],
        last_updated: new Date().toISOString(),
        last_tentative_update: new Date().toISOString(),
        currency: selectedCurrency,
        interest_rate:
          Number(normalizeDecimalForParsing(formData.interest_rate)) || 0,
        maturity_date: formData.maturity_date
          ? formData.maturity_date.toISOString().split("T")[0]
          : null,
        notes: formData.notes,
        symbol: formData.symbol,
        exchange_market: formData.exchange_market,
        taxation: formData.taxation
          ? Number(normalizeDecimalForParsing(formData.taxation))
          : 0,
      },
    };

    return calculateIndividualInvestmentReturns(investmentData);
  }, [formData, selectedType.id, selectedCurrency]);

  if (portfolios.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar
            barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
            backgroundColor={colors.background}
          />
          <TopNavigation
            title={t("addInvestment.title")}
            alignment="center"
            accessoryLeft={renderBackAction}
            style={{ backgroundColor: colors.background }}
          />
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconContainer,
                { backgroundColor: colors.error + "20" },
              ]}
            >
              <Ionicons
                name="briefcase-outline"
                size={32}
                color={colors.error}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t("addInvestment.noPortfoliosAvailable")}
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.icon }]}>
              {t("addInvestment.createPortfolioFirst")}
            </Text>
            <TouchableOpacity
              style={[styles.goBackButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/(protected)/create-portfolio")}
            >
              <Text style={styles.goBackButtonText}>
                {t("addInvestment.createPortfolio")}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />
        <TopNavigation
          title={t("addInvestment.title")}
          alignment="center"
          accessoryLeft={renderBackAction}
          style={{ backgroundColor: colors.background }}
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, shadowColor: colors.text },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("addInvestment.investmentDetails")}
            </Text>

            <Input
              style={styles.input}
              label={t("addInvestment.symbolOrIsin", "Symbol or ISIN")}
              placeholder="e.g., AAPL or US0378331005"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setLookupError("");
              }}
            />
            <Button
              style={[styles.input, styles.findButton]}
              size="medium"
              appearance="outline"
              onPress={handleInvestmentSearch}
              disabled={
                isSearching ||
                !searchQuery.trim() ||
                userProfile?.subscription?.subscription_tier !== "premium"
              }
              accessoryLeft={
                isSearching
                  ? () => <Spinner size="small" />
                  : () => (
                      <Ionicons
                        name="search"
                        size={20}
                        color={colors.primary}
                      />
                    )
              }
            >
              {isSearching
                ? t("addInvestment.searching")
                : userProfile?.subscription?.subscription_tier !== "premium"
                  ? `${t("addInvestment.findInvestment")} (Premium Feature)`
                  : t("addInvestment.findInvestment")}
            </Button>

            <Text style={[styles.instructionText, { color: colors.icon }]}>
              {t(
                "addInvestment.symbolOrIsinLookupInstruction",
                "Enter a stock symbol (e.g., AAPL) or ISIN code (e.g., US0378331005) to search for investment data.",
              )}
            </Text>

            {lookupError && (
              <View
                style={[
                  styles.errorAlert,
                  {
                    backgroundColor: colors.error + "15",
                    borderColor: colors.error + "30",
                  },
                ]}
              >
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={[styles.errorAlertText, { color: colors.error }]}>
                  {lookupError}
                </Text>
              </View>
            )}

            {showSearchResults && searchResults.length > 0 && (
              <View
                style={[
                  styles.searchResultsContainer,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.searchResultsTitle, { color: colors.text }]}
                >
                  {t("addInvestment.searchResults", "Search Results")}
                </Text>
                <ScrollView
                  style={styles.searchResultsList}
                  nestedScrollEnabled={true}
                >
                  {searchResults.map((result, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.searchResultItem,
                        { borderBottomColor: colors.border },
                      ]}
                      onPress={() => handleSelectSearchResult(result)}
                    >
                      <View style={styles.searchResultContent}>
                        <Text
                          style={[
                            styles.searchResultSymbol,
                            { color: colors.text },
                          ]}
                        >
                          {result.symbol}
                        </Text>
                        <Text
                          style={[
                            styles.searchResultName,
                            { color: colors.text },
                          ]}
                        >
                          {result.name}
                        </Text>
                        <View style={styles.searchResultDetails}>
                          <Text
                            style={[
                              styles.searchResultDetail,
                              { color: colors.icon },
                            ]}
                          >
                            {result.exchange} | {result.currency} |{" "}
                            {result.isin}
                          </Text>
                          <Text
                            style={[
                              styles.searchResultPrice,
                              { color: colors.text },
                            ]}
                          >
                            {result.price} {result.currency}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.searchResultSymbolCTA,
                            { color: colors.primary },
                          ]}
                        >
                          Select
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.closeSearchResults}
                  onPress={() => setShowSearchResults(false)}
                >
                  <Text
                    style={[
                      styles.closeSearchResultsText,
                      { color: colors.primary },
                    ]}
                  >
                    {t("addInvestment.close", "Close")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Input
              style={styles.input}
              label={t("addInvestment.symbol")}
              placeholder="e.g., AAPL"
              value={formData.symbol}
              onChangeText={(text) => {
                setFormData((prev) => ({
                  ...prev,
                  symbol: text.toUpperCase(),
                }));
              }}
            />

            <Input
              style={styles.input}
              label={t("addInvestment.isinCode")}
              placeholder={t("addInvestment.enterIsinCode")}
              value={formData.isin}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, isin: text.toUpperCase() }));
              }}
            />

            <Input
              style={styles.input}
              label={t("addInvestment.exchangeMarket")}
              placeholder="e.g., NASDAQ, LSE, XETRA"
              value={formData.exchange_market}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, exchange_market: text }));
                setLookupError("");
              }}
            />
            <Text style={[styles.instructionText, { color: colors.icon }]}>
              {t("addInvestment.exchangeMarketInstruction")}
            </Text>

            <Select
              style={styles.input}
              label={t("addInvestment.investmentType")}
              placeholder={t("addInvestment.selectType")}
              value={selectedTypeName || ""}
              selectedIndex={selectedTypeIndex}
              onSelect={(index) => setSelectedTypeIndex(index as IndexPath)}
            >
              {INVESTMENT_TYPES.map((type, index) => (
                <SelectItem
                  key={index}
                  title={t(`investmentTypes.${type.id}`)}
                />
              ))}
            </Select>

            <Select
              style={styles.input}
              label={t("addInvestment.currency")}
              placeholder={t("addInvestment.selectCurrency")}
              value={selectedCurrency || ""}
              selectedIndex={selectedCurrencyIndex}
              onSelect={(index) => setSelectedCurrencyIndex(index as IndexPath)}
            >
              {currencies.map((currency, index) => (
                <SelectItem key={index} title={currency} />
              ))}
            </Select>

            <Select
              style={styles.input}
              label={t("addInvestment.portfolio")}
              placeholder={t("addInvestment.selectPortfolio")}
              value={selectedPortfolio?.data?.name || ""}
              selectedIndex={selectedPortfolioIndex}
              onSelect={(index) =>
                setSelectedPortfolioIndex(index as IndexPath)
              }
              status={selectedPortfolio ? "basic" : "danger"}
            >
              {portfolios.map((portfolio, index) => (
                <SelectItem
                  key={index}
                  title={portfolio.data?.name || `Portfolio ${index + 1}`}
                />
              ))}
            </Select>

            <Input
              style={styles.input}
              label={t("addInvestment.investmentName")}
              placeholder={t("addInvestment.enterInvestmentName")}
              value={formData.name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, name: text }))
              }
              status={formData.name.trim() ? "basic" : "danger"}
            />

            <Input
              style={styles.input}
              label={t("addInvestment.quantity")}
              placeholder={t("addInvestment.quantityDescription")}
              value={formData.quantity}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, quantity: text }))
              }
              keyboardType="decimal-pad"
              status={
                formData.quantity.trim() &&
                !isNaN(Number(normalizeDecimalForParsing(formData.quantity))) &&
                Number(normalizeDecimalForParsing(formData.quantity)) > 0
                  ? "basic"
                  : "danger"
              }
            />
            <Text style={[styles.premiumNote, { color: colors.icon }]}>
              {t("addInvestment.purchasePriceNote")}
            </Text>

            <Input
              style={styles.input}
              label={t("addInvestment.purchasePrice")}
              placeholder="0.00"
              value={formData.purchase_price}
              onChangeText={(text) => {
                setFormData((prev) => ({
                  ...prev,
                  purchase_price: text,
                }));
              }}
              keyboardType="decimal-pad"
              status={
                formData.purchase_price.trim() &&
                !isNaN(
                  Number(normalizeDecimalForParsing(formData.purchase_price)),
                ) &&
                Number(normalizeDecimalForParsing(formData.purchase_price)) > 0
                  ? "basic"
                  : "danger"
              }
            />

            <Input
              style={styles.input}
              label={t("addInvestment.currentPrice")}
              placeholder="0.00"
              value={formData.current_price}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, current_price: text }))
              }
              keyboardType="decimal-pad"
            />
            <Text style={[styles.premiumNote, { color: colors.icon }]}>
              {t("addInvestment.automaticPriceUpdates")}
            </Text>

            <View style={styles.taxationContainer}>
              <Input
                style={styles.taxationInput}
                label={t("addInvestment.taxation")}
                placeholder="0"
                value={formData.taxation}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, taxation: text }))
                }
                keyboardType="decimal-pad"
                status={errors.taxation ? "danger" : "basic"}
              />
              <Text style={[styles.percentageSymbol, { color: colors.text }]}>
                %
              </Text>
            </View>
            {errors.taxation && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errors.taxation}
              </Text>
            )}

            <Input
              style={styles.input}
              label={t("addInvestment.interestRate")}
              placeholder="e.g., 3.5"
              value={formData.interest_rate}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, interest_rate: text }))
              }
              keyboardType="decimal-pad"
              status={errors.interest_rate ? "danger" : "basic"}
            />
            {errors.interest_rate && (
              <Text style={styles.errorText}>{errors.interest_rate}</Text>
            )}

            {(selectedType.id === "bond" ||
              selectedType.id === "certificate" ||
              selectedType.id === "savingsAccount") && (
              <>
                <Datepicker
                  style={styles.input}
                  label={t("addInvestment.maturityDate")}
                  date={formData.maturity_date}
                  onSelect={(date) =>
                    setFormData((prev) => ({ ...prev, maturity_date: date }))
                  }
                  status={errors.maturity_date ? "danger" : "basic"}
                  min={
                    new Date(
                      formData.purchase_date.getTime() + 24 * 60 * 60 * 1000,
                    )
                  }
                  max={new Date(2050, 11, 31)}
                />
                {errors.maturity_date && (
                  <Text style={styles.errorText}>{errors.maturity_date}</Text>
                )}
              </>
            )}

            <Datepicker
              style={styles.input}
              label={t("addInvestment.purchaseDate")}
              date={formData.purchase_date}
              onSelect={(date) =>
                setFormData((prev) => ({ ...prev, purchase_date: date }))
              }
              min={new Date(2000, 0, 1)} // or whatever lower bound you want
              max={
                new Date(new Date().setFullYear(new Date().getFullYear() + 1))
              }
            />

            <Input
              style={styles.input}
              label={t("addInvestment.notes")}
              placeholder={t("addInvestment.notesPlaceholder")}
              value={formData.notes}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, notes: text }))
              }
              multiline
              textStyle={{ minHeight: 64 }}
            />
          </View>

          {/* Summary Card */}
          {formData.quantity && formData.purchase_price && (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, shadowColor: colors.text },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("addInvestment.investmentSummary")}
              </Text>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                  {t("addInvestment.totalInvestment")}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {formatCurrency(
                    Number(normalizeDecimalForParsing(formData.quantity)) *
                      Number(
                        normalizeDecimalForParsing(formData.purchase_price),
                      ),
                  )}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                  {t("addInvestment.currentValue")}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {formatCurrency(investmentReturns.totalValue)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                  {t("addInvestment.totalGainLoss")}
                </Text>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        investmentReturns.totalGainLoss >= 0
                          ? "#4CAF50"
                          : "#F44336",
                    },
                  ]}
                >
                  {investmentReturns.totalGainLoss >= 0 ? "+" : ""}
                  {formatCurrency(investmentReturns.totalGainLoss)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                  {t("addInvestment.totalGainLossPercentage")}
                </Text>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        investmentReturns.totalGainLoss >= 0
                          ? "#4CAF50"
                          : "#F44336",
                    },
                  ]}
                >
                  {investmentReturns.totalGainLoss >= 0 ? "+" : ""}
                  {investmentReturns.totalGainLossPercentage.toFixed(2)}%
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                  {t("addInvestment.estimatedYearlyGainLoss")}
                </Text>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        investmentReturns.estimatedYearlyGainLoss >= 0
                          ? "#4CAF50"
                          : "#F44336",
                    },
                  ]}
                >
                  {investmentReturns.estimatedYearlyGainLoss >= 0 ? "+" : ""}
                  {formatCurrency(investmentReturns.estimatedYearlyGainLoss)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                  {t("addInvestment.estimatedYearlyGainLossPercentage")}
                </Text>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        investmentReturns.estimatedYearlyGainLoss >= 0
                          ? "#4CAF50"
                          : "#F44336",
                    },
                  ]}
                >
                  {investmentReturns.estimatedYearlyGainLoss >= 0 ? "+" : ""}
                  {investmentReturns.estimatedYearlyGainLossPercentage.toFixed(
                    2,
                  )}
                  %
                </Text>
              </View>

              {investmentReturns.dividendsInterestEarned > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                    {t("addInvestment.dividendsInterestEarned")}
                  </Text>
                  <Text style={[styles.summaryValue, { color: "#4CAF50" }]}>
                    {formatCurrency(investmentReturns.dividendsInterestEarned)}{" "}
                    (
                    {investmentReturns.dividendsInterestEarnedPercentage.toFixed(
                      2,
                    )}
                    %)
                  </Text>
                </View>
              )}
            </View>
          )}

          <Button
            style={styles.submitButton}
            size="large"
            onPress={handleSubmit}
            disabled={isSubmitting}
            accessoryLeft={
              isSubmitting
                ? () => <Spinner size="small" status="control" />
                : undefined
            }
          >
            {isSubmitting
              ? t("addInvestment.addingInvestment")
              : t("addInvestment.addInvestment")}
          </Button>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    marginBottom: 20,
    padding: 24,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
  },
  input: {
    marginBottom: 20,
    borderRadius: 12,
  },
  searchButton: {
    marginBottom: 20,
    borderRadius: 12,
    height: 40,
    width: "100%",
  },
  searchResultsContainer: {
    marginTop: -10,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: "600",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultSymbol: {
    fontSize: 14,
    fontWeight: "700",
  },
  searchResultName: {
    fontSize: 12,
    marginTop: 2,
  },
  searchResultDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  searchResultDetail: {
    fontSize: 11,
  },
  searchResultPrice: {
    fontSize: 12,
    fontWeight: "600",
  },
  searchResultSymbolCTA: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: "#4CAF50",
  },
  closeSearchResults: {
    padding: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
  },
  closeSearchResultsText: {
    fontSize: 14,
    fontWeight: "600",
  },
  submitButton: {
    marginHorizontal: 20,
    marginBottom: 32,
    borderRadius: 16,
    height: 56,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 24,
  },
  goBackButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  goBackButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  backButton: {
    padding: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  findButton: {
    marginBottom: 16,
  },
  confirmButton: {
    marginBottom: 16,
  },
  premiumNote: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: -12,
    marginBottom: 16,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: -12,
    marginBottom: 16,
    textAlign: "center",
  },
  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: -12,
    marginBottom: 16,
  },
  errorAlertText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  taxationContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  taxationInput: {
    flex: 1,
    marginBottom: 0,
    borderRadius: 12,
  },
  percentageSymbol: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    marginBottom: 16,
  },
});
