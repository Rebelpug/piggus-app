import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  ScrollView,
  Alert,
  View,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import {
  Layout,
  Text,
  Input,
  Button,
  TopNavigation,
  Select,
  SelectItem,
  IndexPath,
  Datepicker,
  Card,
  Spinner,
} from "@ui-kitten/components";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useInvestment } from "@/context/InvestmentContext";
import { useProfile } from "@/context/ProfileContext";
import { useLocalization } from "@/context/LocalizationContext";
import {
  calculateIndividualInvestmentReturns,
  InvestmentStats,
} from "@/utils/financeUtils";
import {
  INVESTMENT_TYPES,
  InvestmentData,
  InvestmentLookupResultV2,
} from "@/types/investment";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { ThemedView } from "@/components/ThemedView";
import {
  formatStringWithoutSpacesAndSpecialChars,
  normalizeDecimalForParsing,
} from "@/utils/stringUtils";
import { apiSearchSymbolsWithQuotes } from "@/services/investmentService";
import { isPriceUpdateFailed } from "@/utils/investmentUtils";

const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "CNY"];

export default function EditInvestmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { portfolios, updateInvestment, deleteInvestment, addInvestment } =
    useInvestment();
  const { userProfile } = useProfile();
  const { t } = useLocalization();

  // Helper function to check if investment type supports maturity date (only bonds)
  const supportsMaturityDate = (typeId: string) => {
    return (
      typeId === "bond" ||
      typeId === "certificate" ||
      typeId === "savingsAccount"
    );
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [investment, setInvestment] = useState<any>(null);

  // Search functionality
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

  // Form state
  const [selectedPortfolioIndex, setSelectedPortfolioIndex] =
    useState<IndexPath>(new IndexPath(0));
  const [selectedTypeIndex, setSelectedTypeIndex] = useState<IndexPath>(
    new IndexPath(0),
  );
  const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<IndexPath>(
    new IndexPath(initialCurrencyIndex),
  );

  const [formData, setFormData] = useState({
    name: "",
    isin: "",
    exchange_market: "",
    symbol: "",
    quantity: "",
    purchase_price: "",
    current_price: "",
    taxation: "",
    purchase_date: new Date(),
    notes: "",
    interest_rate: "",
    maturity_date: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years from now
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Load investment data from params
  useEffect(() => {
    if (
      params.investmentId &&
      params.portfolioId &&
      portfolios.length > 0 &&
      !investment
    ) {
      const foundPortfolio = portfolios.find(
        (p) => p.id === params.portfolioId,
      );
      if (foundPortfolio) {
        const foundInvestment = foundPortfolio.investments?.find(
          (i) => i.id === params.investmentId,
        );
        if (foundInvestment) {
          setInvestment(foundInvestment);

          // Pre-fill form data
          setFormData({
            name: foundInvestment.data.name || "",
            isin: foundInvestment.data.isin || "",
            exchange_market: foundInvestment.data.exchange_market || "",
            symbol: foundInvestment.data.symbol || "",
            quantity: foundInvestment.data.quantity?.toString() || "",
            purchase_price:
              foundInvestment.data.purchase_price?.toString() || "",
            current_price: foundInvestment.data.current_price?.toString() || "",
            taxation: foundInvestment.data.taxation
              ? foundInvestment.data.taxation.toString()
              : "",
            purchase_date: foundInvestment.data.purchase_date
              ? new Date(foundInvestment.data.purchase_date)
              : new Date(),
            notes: foundInvestment.data.notes || "",
            interest_rate: foundInvestment.data.interest_rate?.toString() || "",
            maturity_date: foundInvestment.data.maturity_date
              ? new Date(foundInvestment.data.maturity_date)
              : new Date(),
          });

          // Set selected indices
          const portfolioIndex = portfolios.findIndex(
            (p) => p.id === params.portfolioId,
          );
          if (portfolioIndex >= 0) {
            setSelectedPortfolioIndex(new IndexPath(portfolioIndex));
          }

          const typeIndex = INVESTMENT_TYPES.findIndex(
            (t) => t.id === foundInvestment.data.type,
          );
          if (typeIndex >= 0) {
            setSelectedTypeIndex(new IndexPath(typeIndex));
          }

          const currencyIndex = currencies.findIndex(
            (c) => c === foundInvestment.data.currency,
          );
          if (currencyIndex >= 0) {
            setSelectedCurrencyIndex(new IndexPath(currencyIndex));
          }
        }
      }
    }
  }, [
    params.investmentId,
    params.portfolioId,
    portfolios.length,
    investment,
    portfolios,
  ]);

  const selectedPortfolio = portfolios[selectedPortfolioIndex.row];
  const selectedType = INVESTMENT_TYPES[selectedTypeIndex.row];
  const selectedTypeName = selectedType
    ? t(`investmentTypes.${selectedType.id}`)
    : "";
  const selectedCurrency = currencies[selectedCurrencyIndex.row];

  // Check if price update failed using shared utility
  const priceUpdateFailed = isPriceUpdateFailed(
    investment?.data?.last_tentative_update,
    investment?.data?.last_updated,
  );

  const handleSymbolSearch = async () => {
    if (!formData.symbol.trim()) {
      setLookupError(
        t(
          "editInvestment.enterSymbolToSearch",
          "Please enter a symbol to search",
        ),
      );
      return;
    }

    setIsSearching(true);
    setLookupError("");
    setSearchResults([]);

    try {
      const response = await apiSearchSymbolsWithQuotes(
        formData.symbol.trim().toUpperCase(),
      );

      if (response.success && response.data) {
        if (!response.data || response.data.length === 0) {
          setLookupError(
            t(
              "editInvestment.noInvestmentsFound",
              "No investments found for the given symbol",
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
              "editInvestment.failedToSearch",
              "Failed to search for investments",
            ),
        );
      }
    } catch (error) {
      console.error("Symbol search error:", error);
      setLookupError(
        t(
          "editInvestment.unexpectedSearchError",
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
      exchange_market: result.exchange,
      current_price: result?.price || "",
      // Note: We don't update purchase_price here as per requirements
    }));

    // Update currency selection if it exists in our list
    const currencyIndex = currencies.findIndex((c) => c === result.currency);
    if (currencyIndex >= 0) {
      setSelectedCurrencyIndex(new IndexPath(currencyIndex));
    }

    setShowSearchResults(false);
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = t("editInvestment.investmentNameRequired");
    }

    if (!formData.quantity.trim()) {
      newErrors.quantity = t("editInvestment.quantityRequired");
    } else if (
      isNaN(Number(normalizeDecimalForParsing(formData.quantity))) ||
      Number(normalizeDecimalForParsing(formData.quantity)) <= 0
    ) {
      newErrors.quantity = t("editInvestment.quantityPositive");
    }

    if (!formData.purchase_price.trim()) {
      newErrors.purchase_price = t("editInvestment.purchasePriceRequired");
    } else if (
      isNaN(Number(normalizeDecimalForParsing(formData.purchase_price))) ||
      Number(normalizeDecimalForParsing(formData.purchase_price)) <= 0
    ) {
      newErrors.purchase_price = t("editInvestment.purchasePricePositive");
    }

    if (
      formData.current_price &&
      (isNaN(Number(normalizeDecimalForParsing(formData.current_price))) ||
        Number(normalizeDecimalForParsing(formData.current_price)) <= 0)
    ) {
      newErrors.current_price = t("editInvestment.currentPricePositive");
    }

    if (
      formData.taxation &&
      (isNaN(Number(normalizeDecimalForParsing(formData.taxation))) ||
        Number(normalizeDecimalForParsing(formData.taxation)) < 0 ||
        Number(normalizeDecimalForParsing(formData.taxation)) > 100)
    ) {
      newErrors.taxation = t("editInvestment.taxationValidRange");
    }

    if (
      formData.interest_rate &&
      (isNaN(Number(normalizeDecimalForParsing(formData.interest_rate))) ||
        Number(normalizeDecimalForParsing(formData.interest_rate)) < 0)
    ) {
      newErrors.interest_rate = t("editInvestment.interestRateValidRange");
    }

    if (
      supportsMaturityDate(selectedType.id) &&
      formData.maturity_date &&
      formData.maturity_date <= formData.purchase_date
    ) {
      newErrors.maturity_date = t("editInvestment.maturityDateAfterPurchase");
    }

    if (!selectedPortfolio) {
      newErrors.portfolio = t("editInvestment.selectPortfolioRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const investmentData: InvestmentData = {
        name: formData.name.trim(),
        isin: formatStringWithoutSpacesAndSpecialChars(
          formData.isin,
        ).toUpperCase(),
        exchange_market: formData.exchange_market?.trim()?.toUpperCase(),
        symbol: formData.symbol.trim() || null,
        type: selectedType.id,
        quantity: Number(normalizeDecimalForParsing(formData.quantity)),
        purchase_price: Number(
          normalizeDecimalForParsing(formData.purchase_price),
        ),
        current_price: formData.current_price
          ? Number(normalizeDecimalForParsing(formData.current_price))
          : Number(normalizeDecimalForParsing(formData.purchase_price)),
        purchase_date: formData.purchase_date.toISOString(),
        currency: selectedCurrency,
        last_updated: new Date().toISOString(),
        last_tentative_update: new Date().toISOString(),
        notes: formData.notes.trim() || null,
        taxation: formData.taxation
          ? Number(normalizeDecimalForParsing(formData.taxation))
          : 0,
        interest_rate: formData.interest_rate
          ? Number(normalizeDecimalForParsing(formData.interest_rate))
          : null,
        maturity_date:
          supportsMaturityDate(selectedType.id) && formData.maturity_date
            ? formData.maturity_date.toISOString()
            : null,
      };

      const originalPortfolioId = params.portfolioId as string;
      const newPortfolioId = selectedPortfolio.id;

      // Check if the portfolio has changed
      if (originalPortfolioId !== newPortfolioId) {
        // Moving investment to a different portfolio: delete from original, add to new
        await deleteInvestment(originalPortfolioId, investment.id);
        const result = await addInvestment(newPortfolioId, investmentData);

        if (result) {
          router.back();
        } else {
          Alert.alert(
            t("editInvestment.error"),
            t("editInvestment.updateInvestmentFailed"),
          );
        }
      } else {
        // Same portfolio: just update the investment
        const updatedInvestment = {
          ...investment,
          data: investmentData,
        };

        const result = await updateInvestment(
          selectedPortfolio.id,
          updatedInvestment,
        );

        if (result) {
          router.back();
        } else {
          Alert.alert(
            t("editInvestment.error"),
            t("editInvestment.updateInvestmentFailed"),
          );
        }
      }
    } catch (error) {
      console.error("Error updating investment:", error);
      Alert.alert(
        t("editInvestment.error"),
        t("editInvestment.unexpectedError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t("editInvestment.deleteInvestment"),
      t("editInvestment.deleteInvestmentConfirm"),
      [
        {
          text: t("editInvestment.cancel"),
          style: "cancel",
        },
        {
          text: t("editInvestment.delete"),
          style: "destructive",
          onPress: confirmDelete,
        },
      ],
    );
  };

  const confirmDelete = async () => {
    setIsDeleting(true);

    try {
      await deleteInvestment(
        selectedPortfolio.id,
        params.investmentId as string,
      );
      router.replace("/(protected)/(tabs)/investments");
    } catch (error) {
      console.error("Error deleting investment:", error);
      Alert.alert(
        t("editInvestment.error"),
        t("editInvestment.unexpectedError"),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const navigateBack = () => {
    router.back();
  };

  const renderBackAction = () => (
    <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={colors.text} />
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

  if (!investment || portfolios.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <TopNavigation
          title={t("editInvestment.title")}
          alignment="center"
          accessoryLeft={renderBackAction}
          style={{ backgroundColor: colors.background }}
        />
        <Layout style={styles.loadingContainer}>
          <Text category="h6">{t("editInvestment.investmentNotFound")}</Text>
        </Layout>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />
      <TopNavigation
        title={t("editInvestment.title")}
        alignment="center"
        accessoryLeft={renderBackAction}
        accessoryRight={() => (
          <TouchableOpacity
            onPress={handleSubmit}
            style={styles.saveButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Text style={[styles.saveButtonText, { color: colors.primary }]}>
                {t("editInvestment.saving")}
              </Text>
            ) : (
              <Text style={[styles.saveButtonText, { color: colors.primary }]}>
                {t("editInvestment.save")}
              </Text>
            )}
          </TouchableOpacity>
        )}
        style={{ backgroundColor: colors.background }}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView
          style={[
            styles.contentContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Price Update Failed Warning */}
          {priceUpdateFailed && (
            <View
              style={[
                styles.warningAlert,
                {
                  backgroundColor: colors.warning + "15",
                  borderColor: colors.warning + "30",
                },
              ]}
            >
              <Ionicons name="warning" size={16} color={colors.warning} />
              <View style={styles.warningContent}>
                <Text style={[styles.warningTitle, { color: colors.warning }]}>
                  {t(
                    "editInvestment.priceUpdateFailed",
                    "Automatic price update failed",
                  )}
                </Text>
                <Text style={[styles.warningText, { color: colors.text }]}>
                  {t(
                    "editInvestment.priceUpdateFailedDescription",
                    "The automatic price update failed today. Please search for the symbol again to verify it's correct and get the latest price.",
                  )}
                </Text>
              </View>
            </View>
          )}

          {/* Basic Information */}
          <Card style={[styles.formCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("editInvestment.basicInformation")}
            </Text>

            <Select
              label={t("editInvestment.portfolioRequired")}
              selectedIndex={selectedPortfolioIndex}
              onSelect={(index) =>
                setSelectedPortfolioIndex(index as IndexPath)
              }
              value={
                selectedPortfolio?.data?.name ||
                t("editInvestment.selectPortfolio")
              }
              style={[styles.input, errors.portfolio && styles.inputError]}
            >
              {portfolios.map((portfolio, index) => (
                <SelectItem
                  key={index}
                  title={portfolio.data?.name || `Portfolio ${index + 1}`}
                />
              ))}
            </Select>
            {errors.portfolio && (
              <Text style={styles.errorText}>{errors.portfolio}</Text>
            )}

            <Input
              label={t("editInvestment.investmentNameRequired")}
              placeholder={t("editInvestment.investmentNamePlaceholder")}
              value={formData.name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, name: text }))
              }
              style={[styles.input, errors.name && styles.inputError]}
              status={errors.name ? "danger" : "basic"}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <Input
              label={t("editInvestment.symbolOptional")}
              placeholder={t("editInvestment.symbolPlaceholder")}
              value={formData.symbol}
              onChangeText={(text) => {
                setFormData((prev) => ({
                  ...prev,
                  symbol: text.toUpperCase(),
                }));
                setLookupError("");
              }}
              style={styles.input}
            />
            <Button
              style={[styles.input, styles.findButton]}
              size="medium"
              appearance="outline"
              onPress={handleSymbolSearch}
              disabled={
                isSearching ||
                !formData.symbol.trim() ||
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
                ? t("editInvestment.searching", "Searching...")
                : userProfile?.subscription?.subscription_tier !== "premium"
                  ? `${t("editInvestment.findInvestment", "Find Investment")} ${t("editInvestment.premiumFeature")}`
                  : t("editInvestment.findInvestment", "Find Investment")}
            </Button>

            <Text style={[styles.instructionText, { color: colors.icon }]}>
              {t("editInvestment.symbolLookupInstruction")}
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
                  {t("editInvestment.searchResults", "Search Results")}
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
                            {result.exchange} | {result.currency}
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
                    {t("editInvestment.close", "Close")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Select
              label={t("editInvestment.investmentTypeRequired")}
              selectedIndex={selectedTypeIndex}
              onSelect={(index) => setSelectedTypeIndex(index as IndexPath)}
              value={selectedTypeName || ""}
              style={styles.input}
            >
              {INVESTMENT_TYPES.map((type, index) => (
                <SelectItem
                  key={index}
                  title={t(`investmentTypes.${type.id}`)}
                />
              ))}
            </Select>

            <Select
              label={t("editInvestment.currency")}
              selectedIndex={selectedCurrencyIndex}
              onSelect={(index) => setSelectedCurrencyIndex(index as IndexPath)}
              value={selectedCurrency}
              style={styles.input}
            >
              {currencies.map((currency, index) => (
                <SelectItem key={index} title={currency} />
              ))}
            </Select>

            <Input
              label={t("editInvestment.exchangeMarketOptional")}
              placeholder={t("editInvestment.exchangePlaceholder")}
              value={formData.exchange_market}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, exchange_market: text }))
              }
              style={styles.input}
            />
            <Text style={[styles.instructionText, { color: colors.icon }]}>
              {t("addInvestment.exchangeMarketInstruction")}
            </Text>

            <Input
              label={t("editInvestment.isinOptional")}
              placeholder={t("editInvestment.isinPlaceholder")}
              value={formData.isin}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, isin: text }))
              }
              style={styles.input}
            />
          </Card>

          {/* Investment Details */}
          <Card style={[styles.formCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("editInvestment.investmentDetails")}
            </Text>

            <Input
              label={t("editInvestment.quantityRequired")}
              placeholder={t("editInvestment.quantityDescription")}
              value={formData.quantity}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, quantity: text }))
              }
              keyboardType="numeric"
              style={[styles.input, errors.quantity && styles.inputError]}
              status={errors.quantity ? "danger" : "basic"}
            />
            {errors.quantity && (
              <Text style={styles.errorText}>{errors.quantity}</Text>
            )}
            <Text style={[styles.premiumNote, { color: colors.icon }]}>
              {t("addInvestment.purchasePriceNote")}
            </Text>

            <Input
              label={t("editInvestment.purchasePriceRequired")}
              placeholder={t("editInvestment.pricePlaceholder")}
              value={formData.purchase_price}
              onChangeText={(text) => {
                setFormData((prev) => ({
                  ...prev,
                  purchase_price: text,
                }));
              }}
              keyboardType="numeric"
              style={[styles.input, errors.purchase_price && styles.inputError]}
              status={errors.purchase_price ? "danger" : "basic"}
            />
            {errors.purchase_price && (
              <Text style={styles.errorText}>{errors.purchase_price}</Text>
            )}

            <Input
              label={t("editInvestment.currentPriceOptional")}
              placeholder={t("editInvestment.currentPriceDescription")}
              value={formData.current_price}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, current_price: text }))
              }
              keyboardType="numeric"
              style={[styles.input, errors.current_price && styles.inputError]}
              status={errors.current_price ? "danger" : "basic"}
            />
            {errors.current_price && (
              <Text style={styles.errorText}>{errors.current_price}</Text>
            )}
            <Text style={[styles.premiumNote, { color: colors.icon }]}>
              {t("editInvestment.automaticPriceUpdates")}
            </Text>

            <View style={styles.taxationContainer}>
              <Input
                style={styles.taxationInput}
                label={t("editInvestment.taxation")}
                placeholder={t("editInvestment.taxationPlaceholder")}
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

            {
              <>
                <Input
                  label={t("editInvestment.interestRate")}
                  placeholder={t("editInvestment.interestRatePlaceholder")}
                  value={formData.interest_rate}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, interest_rate: text }))
                  }
                  keyboardType="numeric"
                  style={[
                    styles.input,
                    errors.interest_rate && styles.inputError,
                  ]}
                  status={errors.interest_rate ? "danger" : "basic"}
                />
                {errors.interest_rate && (
                  <Text style={styles.errorText}>{errors.interest_rate}</Text>
                )}

                {supportsMaturityDate(selectedType.id) && (
                  <>
                    <Datepicker
                      label={t("editInvestment.maturityDate")}
                      date={formData.maturity_date}
                      onSelect={(date) =>
                        setFormData((prev) => ({
                          ...prev,
                          maturity_date: date,
                        }))
                      }
                      style={[
                        styles.input,
                        errors.maturity_date && styles.inputError,
                      ]}
                      status={errors.maturity_date ? "danger" : "basic"}
                      min={
                        new Date(
                          formData.purchase_date.getTime() +
                            24 * 60 * 60 * 1000,
                        )
                      }
                      max={new Date(2050, 11, 31)}
                    />
                    {errors.maturity_date && (
                      <Text style={styles.errorText}>
                        {errors.maturity_date}
                      </Text>
                    )}
                  </>
                )}
              </>
            }

            <Datepicker
              label={t("editInvestment.purchaseDateRequired")}
              date={formData.purchase_date}
              onSelect={(date) =>
                setFormData((prev) => ({ ...prev, purchase_date: date }))
              }
              style={styles.input}
              min={new Date(2000, 0, 1)} // or whatever lower bound you want
              max={
                new Date(new Date().setFullYear(new Date().getFullYear() + 1))
              }
            />

            <Input
              label={t("editInvestment.notesOptional")}
              placeholder={t("editInvestment.notesPlaceholder")}
              value={formData.notes}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, notes: text }))
              }
              multiline={true}
              textStyle={{ minHeight: 64 }}
              style={styles.input}
            />
          </Card>

          {/* Summary Card */}
          {formData.quantity && formData.purchase_price && (
            <Card style={[styles.formCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("editInvestment.investmentSummary")}
              </Text>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                  {t("editInvestment.totalInvestment")}
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
                  {t("editInvestment.currentValue")}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {formatCurrency(investmentReturns.totalValue)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                  {t("editInvestment.totalGainLoss")}
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
                  {t("editInvestment.totalGainLossPercentage")}
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
                  {t("editInvestment.estimatedYearlyGainLoss")}
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
                  {t("editInvestment.estimatedYearlyGainLossPercentage")}
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
                    {t("editInvestment.dividendsInterestEarned")}
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
            </Card>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              style={[styles.actionButton, styles.saveButtonStyle]}
              appearance="filled"
              status="primary"
              accessoryLeft={() => (
                <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
              )}
              onPress={handleSubmit}
              disabled={isSubmitting || isDeleting}
            >
              {isSubmitting ? t("common.saving") : t("editExpense.save")}
            </Button>
            <Button
              style={[styles.actionButton, styles.deleteButton]}
              appearance="outline"
              status="danger"
              accessoryLeft={() => (
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              )}
              onPress={handleDelete}
              disabled={isSubmitting || isDeleting}
            >
              {isDeleting ? t("common.deleting") : t("expenseDetail.delete")}
            </Button>
          </View>

          <View style={styles.bottomPadding} />
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    padding: 8,
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  formCard: {
    marginBottom: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  inputError: {
    borderColor: "#FF6B6B",
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  instructionText: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: -12,
    marginBottom: 16,
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  saveButtonStyle: {},
  deleteButton: {},
  bottomPadding: {
    height: 32,
  },
  premiumNote: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: -12,
    marginBottom: 16,
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
  // Search functionality styles
  findButton: {
    marginBottom: 16,
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
  // Warning alert styles
  warningAlert: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  warningContent: {
    flex: 1,
    marginLeft: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 16,
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
});
