import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Layout,
  Text,
  Button,
  Card,
  TopNavigation,
  TopNavigationAction,
  Spinner,
} from "@ui-kitten/components";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { useLocalization } from "@/context/LocalizationContext";
import { useProfile } from "@/context/ProfileContext";
import { router } from "expo-router";
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
} from "react-native-purchases";
import { piggusApi } from "@/client/piggusApi";
import { useInvestment } from "@/context/InvestmentContext";

interface PricingTier {
  package: PurchasesPackage;
  localizedPrice: string;
  currencyCode: string;
  originalPrice: number;
  formattedPrice: string;
  // Apple compliance requirements
  subscriptionTitle: string;
  duration: string;
  pricePerDuration: string;
  autoRenewalInfo: string;
}

export default function SubscriptionScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { t } = useLocalization();
  const { userProfile, refreshProfile } = useProfile();
  const { fetchPortfolios } = useInvestment();

  // Helper function to get subscription details for Apple compliance
  const getSubscriptionDetails = (pkg: PurchasesPackage) => {
    const packageType = pkg.packageType;
    const identifier = pkg.identifier.toLowerCase();

    let subscriptionTitle = "";
    let duration = "";
    let pricePerDuration = "";
    let autoRenewalInfo = "";

    // Determine subscription type and duration
    const isAnnual =
      packageType === "ANNUAL" ||
      identifier.includes("annual") ||
      identifier.includes("yearly");
    const isMonthly =
      packageType === "MONTHLY" || identifier.includes("monthly");

    if (isAnnual) {
      subscriptionTitle = t("subscription.annual.title");
      duration = t("subscription.compliance.durationYear");
      pricePerDuration = `${pkg.product.priceString} ${t("subscription.compliance.perYear")}`;
      autoRenewalInfo = t("subscription.autoRenewal.yearly");
    } else if (isMonthly) {
      subscriptionTitle = t("subscription.monthly.title");
      duration = t("subscription.compliance.durationMonth");
      pricePerDuration = `${pkg.product.priceString} ${t("subscription.compliance.perMonth")}`;
      autoRenewalInfo = t("subscription.autoRenewal.monthly");
    } else {
      // Fallback for other subscription types
      subscriptionTitle =
        pkg.product.title || t("subscription.compliance.premiumSubscription");
      duration = t("subscription.compliance.durationCustom");
      pricePerDuration = pkg.product.priceString;
      autoRenewalInfo = t("subscription.autoRenewal.default");
    }

    return {
      subscriptionTitle,
      duration,
      pricePerDuration,
      autoRenewalInfo,
    };
  };
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);

  const isPremium = userProfile?.subscription?.subscription_tier === "premium";
  const hasActiveSubscription = customerInfo?.entitlements.active.premium;

  // Silent retry mechanism
  const retryInitialization = async () => {
    if (retryCount < 3) {
      // Max 3 retries
      setRetryCount((prev) => prev + 1);
      setTimeout(
        () => {
          initializePurchases(true); // Silent retry
        },
        Math.pow(2, retryCount) * 1000,
      ); // Exponential backoff: 1s, 2s, 4s
    }
  };

  const initializePurchases = async (isSilentRetry: boolean = false) => {
    try {
      setLoading(true);
      setHasError(false);

      const apiKey =
        (Platform.OS === "android"
          ? process.env.EXPO_PUBLIC_REVENUE_CAT_GOOGLE_API_KEY
          : process.env.EXPO_PUBLIC_REVENUE_CAT_APPLE_API_KEY) || "";

      // Only configure if not already configured (to avoid multiple configurations)
      try {
        Purchases.configure({ apiKey });
      } catch (error) {
        console.error(
          "RevenueCat configuration error, could be already configured:",
          (error as Error).message,
        );
        // Already configured, ignore
      }

      // Set user ID if you have one
      // await Purchases.logIn(userProfile?.id || 'anonymous');

      // Get offerings and customer info with individual error handling
      let offerings, customerInfo;

      try {
        const results = await Promise.allSettled([
          Purchases.getOfferings(),
          Purchases.getCustomerInfo(),
        ]);

        if (results[0].status === "fulfilled") {
          offerings = results[0].value;
        } else {
          console.error("Failed to get offerings:", results[0].reason);
        }

        if (results[1].status === "fulfilled") {
          customerInfo = results[1].value;
        } else {
          console.error("Failed to get customer info:", results[1].reason);
        }

        // If both failed, throw error
        if (!offerings && !customerInfo) {
          throw new Error("Failed to load subscription data");
        }
      } catch (apiError) {
        console.error("RevenueCat API error:", apiError);
        throw apiError;
      }

      if (offerings) {
        setOfferings(offerings.current);
      }
      if (customerInfo) {
        setCustomerInfo(customerInfo);
      }

      // Process pricing information
      if (offerings?.current?.availablePackages) {
        const processedTiers = offerings.current.availablePackages.map(
          (pkg) => {
            const subscriptionDetails = getSubscriptionDetails(pkg);
            return {
              package: pkg,
              localizedPrice: pkg.product.priceString, // Already localized by the store
              currencyCode: pkg.product.currencyCode || "USD",
              originalPrice: pkg.product.price,
              formattedPrice: formatPrice(
                pkg.product.price,
                pkg.product.currencyCode || "USD",
              ),
              // Apple compliance requirements
              subscriptionTitle: subscriptionDetails.subscriptionTitle,
              duration: subscriptionDetails.duration,
              pricePerDuration: subscriptionDetails.pricePerDuration,
              autoRenewalInfo: subscriptionDetails.autoRenewalInfo,
            };
          },
        );

        setPricingTiers(processedTiers);
      }

      // Reset retry count on success
      setRetryCount(0);
    } catch (error: any) {
      console.error("Error initializing purchases:", error);
      setHasError(true);

      if (!isSilentRetry) {
        // Try silent retry first
        retryInitialization();
      } else {
        // Only show error after retries are exhausted
        if (retryCount >= 3) {
          Alert.alert(
            t("subscription.error"),
            t("subscription.initializationError"),
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializePurchases().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initializePurchases is stable function
  }, []);

  // Helper function to format price (fallback if store doesn't provide formatted string)
  const formatPrice = (price: number, currencyCode: string): string => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 2,
      }).format(price);
    } catch (error) {
      console.error("Error formatting price:", (error as Error).message);
      return `${currencyCode} ${price.toFixed(2)}`;
    }
  };

  // Find the best package for the user's region (you could implement regional logic here)
  const getRecommendedPackage = (): PricingTier | null => {
    if (pricingTiers.length === 0) return null;

    // Example: Different recommendations based on region
    const monthlyPackages = pricingTiers.filter(
      (tier) =>
        tier.package.packageType === "MONTHLY" ||
        tier.package.identifier.includes("monthly"),
    );

    return monthlyPackages[0] || pricingTiers[0];
  };

  const handlePurchase = async (pricingTier: PricingTier) => {
    try {
      setPurchasing(true);

      const { customerInfo } = await Purchases.purchasePackage(
        pricingTier.package,
      );
      setCustomerInfo(customerInfo);

      // Update backend subscription to premium after successful purchase
      try {
        await piggusApi.updateSubscription(
          "premium",
          customerInfo.originalAppUserId,
        );
        await refreshProfile();
        fetchPortfolios().catch(console.error);
      } catch (backendError: any) {
        console.error(
          "Error updating backend subscription after purchase:",
          backendError,
        );

        // Check if it's a RevenueCat validation error
        if (
          backendError?.response?.data?.message?.includes(
            "No active subscription found in RevenueCat",
          )
        ) {
          console.error(
            "Backend validation failed due to RevenueCat API issues - purchase was successful locally",
          );
        } else {
          console.error(
            "Unexpected backend error after purchase:",
            backendError,
          );
        }
        // Still continue and show success - the RevenueCat purchase was successful
      }

      Alert.alert(
        t("subscription.success"),
        t("subscription.purchaseSuccess"),
        [{ text: t("common.ok"), onPress: () => router.back() }],
      );
    } catch (error: any) {
      console.error("Purchase error:", error);
      if (!error.userCancelled) {
        Alert.alert(t("subscription.error"), t("subscription.purchaseError"));
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setPurchasing(true);

      // Add timeout to prevent hanging
      const customerInfo = await Promise.race([
        Purchases.restorePurchases(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Restore timeout")), 30000),
        ),
      ]);

      setCustomerInfo(customerInfo);

      // Update backend subscription based on restored purchase
      try {
        const subscriptionTier = customerInfo.entitlements.active.premium
          ? "premium"
          : "free";

        // Add timeout for backend call as well
        await Promise.race([
          piggusApi.updateSubscription(
            subscriptionTier,
            customerInfo.originalAppUserId,
          ),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Backend update timeout")),
              15000,
            ),
          ),
        ]);

        await refreshProfile();
      } catch (backendError: any) {
        console.error(
          "Error updating backend subscription after restore:",
          backendError,
        );

        // Check if it's a RevenueCat validation error or timeout
        if (
          backendError?.response?.data?.message?.includes(
            "No active subscription found in RevenueCat",
          ) ||
          backendError.message === "Backend update timeout"
        ) {
        } else {
          console.error(
            "Unexpected backend error after restore:",
            backendError,
          );
        }
        // Still continue and show success - the RevenueCat restore was successful
      }

      Alert.alert(t("subscription.restored"), t("subscription.restoreSuccess"));
    } catch (error: any) {
      console.error("Restore error:", error);

      let errorMessage = t("subscription.restoreError");
      if (error.message === "Restore timeout") {
        errorMessage = t("subscription.restoreTimeout");
      }

      Alert.alert(t("subscription.error"), errorMessage);
    } finally {
      setPurchasing(false);
    }
  };

  const openSubscriptionSettings = () => {
    let url;

    if (Platform.OS === "ios") {
      // Direct link to app-specific subscription management on iOS
      url = `https://apps.apple.com/account/subscriptions?appId=6747078622`;
    } else if (Platform.OS === "android") {
      // Direct link to app-specific subscription management on Android
      url =
        "https://play.google.com/store/account/subscriptions?package=com.rebelpug.piggus";
    }

    if (url) {
      Linking.canOpenURL(url)
        .then((supported) => {
          if (supported) {
            Linking.openURL(url);
          } else {
            Alert.alert(
              t("subscription.error"),
              t("subscription.deviceSubscriptionSettings"),
            );
          }
        })
        .catch((err) => {
          console.error("Error opening subscription settings:", err);
          Alert.alert(
            t("subscription.error"),
            t("subscription.deviceSubscriptionSettings"),
          );
        });
    }
  };

  const renderBackAction = () => (
    <TopNavigationAction
      icon={(props) => (
        <Ionicons name="arrow-back" size={24} color={colors.icon} />
      )}
      onPress={() => router.back()}
    />
  );

  const renderFeatureItem = (
    icon: string,
    text: string,
    isPremiumFeature = false,
  ) => (
    <Layout style={styles.featureItem}>
      <Layout
        style={[
          styles.featureIcon,
          isPremiumFeature && { backgroundColor: colors.primary + "20" },
        ]}
      >
        <Ionicons
          name={icon as any}
          size={20}
          color={isPremiumFeature ? colors.primary : colors.text}
        />
      </Layout>
      <Text
        category="s1"
        style={[
          styles.featureText,
          isPremiumFeature && { color: colors.primary },
        ]}
      >
        {text}
      </Text>
    </Layout>
  );

  const renderPricingTierCard = (
    pricingTier: PricingTier,
    isRecommended: boolean = false,
    isCurrentTier: boolean = false,
  ) => {
    const packageType = pricingTier.package.packageType;
    const isAnnual =
      packageType === "ANNUAL" ||
      pricingTier.package.identifier.includes("annual");

    // Calculate savings for annual plans (example logic)
    const monthlySavings = isAnnual
      ? t("subscription.monthsFree", { count: 2 })
      : null;

    // Get renewal date if this is the current active subscription
    const subscription = customerInfo?.entitlements.active.premium;
    const renewalDate =
      isCurrentTier && subscription?.expirationDate
        ? new Date(subscription.expirationDate)
        : null;

    return (
      <Layout
        key={pricingTier.package.identifier}
        style={styles.tierCardContainer}
      >
        {isRecommended && (
          <Layout
            style={[
              styles.recommendedBadge,
              { backgroundColor: colors.success },
            ]}
          >
            <Text category="c2" style={styles.recommendedText}>
              {t("subscription.recommended")}
            </Text>
          </Layout>
        )}

        <Card
          style={[
            styles.tierCard,
            { backgroundColor: colors.card },
            isCurrentTier && { borderColor: colors.primary, borderWidth: 2 },
            isRecommended && { borderColor: colors.success, borderWidth: 2 },
          ]}
        >
          <Layout style={styles.tierHeader}>
            <Text category="h5" style={styles.tierTitle}>
              {isAnnual
                ? t("subscription.annual.title")
                : t("subscription.monthly.title")}
            </Text>

            <Layout style={styles.priceContainer}>
              <Text
                category="h4"
                style={[styles.tierPrice, { color: colors.primary }]}
              >
                {pricingTier.localizedPrice}
              </Text>
              <Text category="c1" appearance="hint" style={styles.pricePeriod}>
                {isAnnual
                  ? t("subscription.perYear")
                  : t("subscription.perMonth")}
              </Text>
            </Layout>

            {monthlySavings && (
              <Layout
                style={[
                  styles.savingsBadge,
                  { backgroundColor: colors.warning + "20" },
                ]}
              >
                <Text
                  category="c2"
                  style={[styles.savingsText, { color: colors.warning }]}
                >
                  {monthlySavings}
                </Text>
              </Layout>
            )}

            {renewalDate && (
              <Layout style={styles.renewalInfo}>
                <Ionicons name="calendar" size={16} color={colors.primary} />
                <Text
                  category="c1"
                  style={[styles.renewalText, { color: colors.primary }]}
                >
                  {t("subscription.renewsOn")}:{" "}
                  {renewalDate.toLocaleDateString()}
                </Text>
              </Layout>
            )}

            <Text
              category="s2"
              appearance="hint"
              style={styles.tierDescription}
            >
              {isAnnual
                ? t("subscription.annual.description")
                : t("subscription.monthly.description")}
            </Text>

            {/* Apple Compliance Information */}
            <Layout style={styles.complianceInfo}>
              <Text
                category="c2"
                appearance="hint"
                style={styles.complianceText}
              >
                <Text style={styles.complianceLabel}>
                  {t("subscription.compliance.duration")}{" "}
                </Text>
                {pricingTier.duration}
              </Text>
              <Text
                category="c2"
                appearance="hint"
                style={styles.complianceText}
              >
                <Text style={styles.complianceLabel}>
                  {t("subscription.compliance.price")}{" "}
                </Text>
                {pricingTier.pricePerDuration}
              </Text>
              <Text
                category="c2"
                appearance="hint"
                style={styles.complianceText}
              >
                {pricingTier.autoRenewalInfo}
              </Text>
            </Layout>
          </Layout>

          <Layout style={styles.featuresContainer}>
            {[
              {
                icon: "people",
                text: t("subscription.features.allFreeFeatures"),
                isPremium: false,
              },
              {
                icon: "card",
                text: t("subscription.features.bankImport"),
                isPremium: true,
              },
              {
                icon: "bar-chart",
                text: t("subscription.features.investmentImport"),
                isPremium: true,
              },
              {
                icon: "trending-up",
                text: t("subscription.features.investmentsUpdate"),
                isPremium: true,
              },
              {
                icon: "heart",
                text: t("subscription.features.supportUs"),
                isPremium: true,
              },
            ].map((feature, index) => (
              <Layout key={index}>
                {renderFeatureItem(
                  feature.icon,
                  feature.text,
                  feature.isPremium,
                )}
              </Layout>
            ))}
          </Layout>

          <Layout style={styles.tierButtonContainer}>
            {isCurrentTier ? (
              <Button
                style={[
                  styles.tierButton,
                  {
                    backgroundColor: colors.warning + "20",
                    borderColor: colors.warning,
                  },
                ]}
                appearance="outline"
                status="warning"
                onPress={openSubscriptionSettings}
              >
                {t("subscription.cancelSubscription")}
              </Button>
            ) : (
              <Button
                style={[
                  styles.tierButton,
                  isRecommended && { backgroundColor: colors.success },
                ]}
                size="large"
                status={isRecommended ? "success" : "primary"}
                onPress={() => handlePurchase(pricingTier)}
                disabled={purchasing}
                accessoryLeft={
                  purchasing
                    ? () => <Spinner size="small" status="control" />
                    : undefined
                }
              >
                {purchasing
                  ? t("subscription.processing")
                  : t("subscription.subscribe")}
              </Button>
            )}
          </Layout>
        </Card>
      </Layout>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <TopNavigation
          title={t("subscription.title")}
          alignment="center"
          accessoryLeft={renderBackAction}
          style={{ backgroundColor: colors.background }}
        />
        <Layout style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text category="s1" style={styles.loadingText}>
            {retryCount > 0
              ? t("subscription.retrying")
              : t("subscription.loading")}
          </Text>
          {retryCount > 0 && (
            <Text category="c1" appearance="hint" style={styles.retryText}>
              {t("subscription.attemptCount", { count: retryCount })}
            </Text>
          )}
        </Layout>
      </SafeAreaView>
    );
  }

  // Show fallback mode if we have partial data or user profile subscription info
  const canShowFallbackMode = userProfile?.subscription || customerInfo;

  // Show error state only after all retries are exhausted and no fallback data
  if (
    hasError &&
    retryCount >= 3 &&
    !offerings &&
    !customerInfo &&
    !canShowFallbackMode
  ) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <TopNavigation
          title={t("subscription.title")}
          alignment="center"
          accessoryLeft={renderBackAction}
          style={{ backgroundColor: colors.background }}
        />
        <Layout style={styles.loadingContainer}>
          <Layout
            style={[
              styles.errorIconContainer,
              { backgroundColor: colors.error + "20" },
            ]}
          >
            <Ionicons name="alert-circle" size={64} color={colors.error} />
          </Layout>
          <Text
            category="h6"
            style={[styles.errorTitle, { color: colors.text }]}
          >
            {t("subscription.loadError")}
          </Text>
          <Text category="s2" appearance="hint" style={styles.errorDescription}>
            {t("subscription.loadErrorDescription")}
          </Text>
          <Button
            style={styles.retryButton}
            size="medium"
            onPress={() => {
              setRetryCount(0);
              setHasError(false);
              initializePurchases();
            }}
          >
            {t("subscription.tryAgain")}
          </Button>
        </Layout>
      </SafeAreaView>
    );
  }

  const recommendedPackage = getRecommendedPackage();
  const freeFeatures = [
    { icon: "pencil", text: t("subscription.features.manualTracking") },
    { icon: "people", text: t("subscription.features.shareExpenses") },
    { icon: "book", text: t("subscription.features.tutorials") },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TopNavigation
        title={t("subscription.title")}
        alignment="center"
        accessoryLeft={renderBackAction}
        style={{ backgroundColor: colors.background }}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <Layout style={styles.content}>
          {/* Warning banner for fallback mode */}
          {hasError && canShowFallbackMode && (
            <Layout
              style={[
                styles.warningBanner,
                {
                  backgroundColor: colors.warning + "15",
                  borderColor: colors.warning + "30",
                },
              ]}
            >
              <Ionicons name="warning" size={20} color={colors.warning} />
              <Layout style={styles.warningContent}>
                <Text
                  category="c1"
                  style={[styles.warningText, { color: colors.warning }]}
                >
                  {t("subscription.limitedMode")}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setRetryCount(0);
                    setHasError(false);
                    initializePurchases();
                  }}
                >
                  <Text
                    category="c2"
                    style={[styles.warningRetryText, { color: colors.warning }]}
                  >
                    {t("subscription.tapToRetry")}
                  </Text>
                </TouchableOpacity>
              </Layout>
            </Layout>
          )}

          <Layout style={styles.headerContainer}>
            <Layout style={styles.iconContainer}>
              <Ionicons name="star" size={64} color={colors.primary} />
            </Layout>
            <Text category="h3" style={styles.headerTitle}>
              {hasActiveSubscription
                ? t("subscription.managePlan")
                : t("subscription.chooseYourPlan")}
            </Text>
          </Layout>

          <Layout style={styles.tiersContainer}>
            {/* Free tier */}
            <Card
              style={[
                styles.tierCard,
                { backgroundColor: colors.card },
                !isPremium &&
                  !customerInfo?.entitlements.active.premium && {
                    borderColor: colors.primary,
                    borderWidth: 2,
                  },
              ]}
            >
              <Layout style={styles.tierHeader}>
                <Text category="h5" style={styles.tierTitle}>
                  {t("subscription.free.title")}
                </Text>
                <Text
                  category="h4"
                  style={[styles.tierPrice, { color: colors.primary }]}
                >
                  {t("subscription.free.price")}
                </Text>
                <Text
                  category="s2"
                  appearance="hint"
                  style={styles.tierDescription}
                >
                  {t("subscription.free.description")}
                </Text>
              </Layout>

              <Layout style={styles.featuresContainer}>
                {freeFeatures.map((feature, index) => (
                  <Layout key={index}>
                    {renderFeatureItem(feature.icon, feature.text)}
                  </Layout>
                ))}
              </Layout>

              <Layout style={styles.tierButtonContainer}>
                {!isPremium && !customerInfo?.entitlements.active.premium ? (
                  <Button
                    style={[
                      styles.tierButton,
                      { backgroundColor: colors.primary + "20" },
                    ]}
                    appearance="ghost"
                    status="primary"
                    disabled
                  >
                    {t("subscription.currentPlan")}
                  </Button>
                ) : null}
              </Layout>
            </Card>

            {/* Premium tiers with dynamic pricing */}
            {pricingTiers.map((pricingTier) =>
              renderPricingTierCard(
                pricingTier,
                pricingTier === recommendedPackage,
                isPremium || !!customerInfo?.entitlements.active.premium,
              ),
            )}
          </Layout>

          <Layout style={styles.footerContainer}>
            <Text category="c1" appearance="hint" style={styles.footerNote}>
              {t("subscription.termsNote")}
            </Text>

            <View style={styles.legalLinks}>
              <TouchableOpacity
                style={styles.legalLink}
                onPress={() =>
                  Linking.openURL("https://piggus.finance/toc-app").catch(
                    (error) => {
                      console.error("Failed to open Terms of Service:", error);
                    },
                  )
                }
              >
                <Text style={[styles.legalLinkText, { color: colors.primary }]}>
                  {t("profile.termsAndConditions")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.legalLink}
                onPress={() =>
                  Linking.openURL("https://piggus.finance/privacy-app").catch(
                    (error) => {
                      console.error("Failed to open Privacy Policy:", error);
                    },
                  )
                }
              >
                <Text style={[styles.legalLinkText, { color: colors.primary }]}>
                  {t("profile.privacyPolicy")}
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              appearance="ghost"
              size="small"
              onPress={handleRestorePurchases}
              disabled={purchasing}
              style={styles.restoreButton}
            >
              {t("subscription.restorePurchases")}
            </Button>
          </Layout>
        </Layout>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  loadingText: {
    marginTop: 16,
    textAlign: "center",
  },
  retryText: {
    marginTop: 8,
    textAlign: "center",
  },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  errorTitle: {
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 8,
  },
  errorDescription: {
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  retryButton: {
    borderRadius: 12,
    paddingHorizontal: 32,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: "transparent",
  },
  warningText: {
    fontWeight: "500",
    marginBottom: 2,
  },
  warningRetryText: {
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
    backgroundColor: "transparent",
  },
  iconContainer: {
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  headerTitle: {
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },
  headerDescription: {
    textAlign: "center",
    lineHeight: 22,
  },
  tiersContainer: {
    marginBottom: 32,
    backgroundColor: "transparent",
  },
  tierCardContainer: {
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  tierCard: {
    padding: 24,
    borderRadius: 16,
  },
  recommendedBadge: {
    alignSelf: "center",
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    color: "white",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  tierHeader: {
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "transparent",
  },
  tierTitle: {
    fontWeight: "600",
    marginBottom: 8,
  },
  priceContainer: {
    alignItems: "center",
    backgroundColor: "transparent",
  },
  tierPrice: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  pricePeriod: {
    marginBottom: 8,
  },
  renewalInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    marginBottom: 8,
  },
  renewalText: {
    marginLeft: 6,
    fontWeight: "500",
    fontSize: 12,
  },
  savingsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  savingsText: {
    fontWeight: "600",
    fontSize: 12,
  },
  tierDescription: {
    textAlign: "center",
    lineHeight: 20,
  },
  featuresContainer: {
    marginBottom: 24,
    backgroundColor: "transparent",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "transparent",
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    backgroundColor: "transparent",
  },
  featureText: {
    flex: 1,
    lineHeight: 20,
  },
  tierButtonContainer: {
    backgroundColor: "transparent",
  },
  tierButton: {
    borderRadius: 12,
    paddingVertical: 16,
  },
  footerContainer: {
    alignItems: "center",
    backgroundColor: "transparent",
  },
  locationNote: {
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 18,
  },
  footerNote: {
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  restoreButton: {
    borderRadius: 8,
  },
  legalLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 16,
    gap: 32,
  },
  legalLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  legalLinkText: {
    fontSize: 14,
    textDecorationLine: "underline",
    textAlign: "center",
  },
  complianceInfo: {
    marginTop: 12,
    marginBottom: 8,
    padding: 8,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  complianceText: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 2,
  },
  complianceLabel: {
    fontWeight: "600",
  },
});
