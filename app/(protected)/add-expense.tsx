import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import {
  Layout,
  Text,
  Input,
  Button,
  Select,
  SelectItem,
  IndexPath,
  Datepicker,
  Toggle,
  TopNavigation,
  Spinner,
  CheckBox,
} from "@ui-kitten/components";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useExpense } from "@/context/ExpenseContext";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { useLocalization } from "@/context/LocalizationContext";
import {
  ExpenseData,
  RecurringExpenseData,
  CURRENCIES,
  SPLIT_METHODS,
  ExpenseParticipant,
  calculateEqualSplit,
  calculateNextDueDate,
  computeExpenseCategories,
  getMainCategories,
  getSubcategories,
  ExpenseCategory,
} from "@/types/expense";
import { Ionicons } from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";
import { normalizeDecimalForParsing } from "@/utils/stringUtils";

export default function AddExpenseScreen() {
  const router = useRouter();
  const { groupId, isRecurring: isRecurringParam } = useLocalSearchParams<{
    groupId?: string;
    isRecurring?: string;
  }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { user } = useAuth();
  const { expensesGroups, addExpense, addRecurringExpense } = useExpense();
  const { userProfile } = useProfile();
  const { t } = useLocalization();

  // Compute categories with user's customizations
  const allCategories = React.useMemo(
    () =>
      computeExpenseCategories(
        userProfile?.profile?.budgeting?.categoryOverrides,
      ),
    [userProfile?.profile?.budgeting?.categoryOverrides],
  );

  // Create hierarchical display list
  const availableCategories = React.useMemo(() => {
    const result: (ExpenseCategory & { displayName: string })[] = [];
    const mainCategories = getMainCategories(allCategories);

    mainCategories.forEach((category) => {
      // Add main category
      result.push({
        ...category,
        displayName: `${category.icon} ${category.name}`,
      });

      // Add subcategories
      const subcategories = getSubcategories(allCategories, category.id);
      subcategories.forEach((subcategory) => {
        result.push({
          ...subcategory,
          displayName: `  ↳ ${subcategory.icon} ${subcategory.name}`,
        });
      });
    });

    return result;
  }, [allCategories]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<
    IndexPath | undefined
  >();
  const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<IndexPath>(
    new IndexPath(0),
  );
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<
    IndexPath | undefined
  >();
  const [isRecurring, setIsRecurring] = useState(isRecurringParam === "true");
  const [recurringInterval, setRecurringInterval] = useState("");
  // Sharing state
  const [selectedPayerIndex, setSelectedPayerIndex] = useState<
    IndexPath | undefined
  >();
  const [selectedSplitMethodIndex, setSelectedSplitMethodIndex] =
    useState<IndexPath>(new IndexPath(0)); // Default to equal split
  const [participants, setParticipants] = useState<ExpenseParticipant[]>([]);
  const [customAmounts, setCustomAmounts] = useState<{
    [userId: string]: string;
  }>({});
  const [shouldGenerateExpenses, setShouldGenerateExpenses] = useState(true);

  // Filter out groups that are confirmed
  const availableGroups = React.useMemo(() => {
    try {
      if (!expensesGroups || !Array.isArray(expensesGroups)) {
        return [];
      }
      return expensesGroups.filter(
        (group) => group && group.membership_status === "confirmed",
      );
    } catch (error) {
      console.error("Error filtering groups:", error);
      return [];
    }
  }, [expensesGroups]);

  // Set default group based on navigation context or fallback to private group
  useEffect(() => {
    if (availableGroups.length > 0) {
      // If groupId is provided via navigation, try to select that group
      if (groupId) {
        const preselectedGroupIndex = availableGroups.findIndex(
          (group) => group.id === groupId,
        );
        if (preselectedGroupIndex !== -1) {
          setSelectedGroupIndex(new IndexPath(preselectedGroupIndex));
          return;
        }
      }

      // Fallback to private group if no groupId provided or groupId not found
      const privateGroupIndex = availableGroups.findIndex(
        (group) => group.data.private === true,
      );
      if (privateGroupIndex !== -1) {
        setSelectedGroupIndex(new IndexPath(privateGroupIndex));
      }
    }
  }, [availableGroups, groupId]);

  // Get current group members
  const currentGroupMembers = React.useMemo(() => {
    if (!selectedGroupIndex || !availableGroups.length) return [];
    const selectedGroup = availableGroups[selectedGroupIndex.row];
    return selectedGroup?.members || [];
  }, [selectedGroupIndex, availableGroups]);

  // Update currency when group is selected
  useEffect(() => {
    if (selectedGroupIndex && availableGroups.length > 0) {
      const selectedGroup = availableGroups[selectedGroupIndex.row];
      if (selectedGroup && selectedGroup.data.currency) {
        const currencyIndex = CURRENCIES.findIndex(
          (currency) => currency.value === selectedGroup.data.currency,
        );
        if (currencyIndex !== -1) {
          setSelectedCurrencyIndex(new IndexPath(currencyIndex));
        }
      }
    }
  }, [selectedGroupIndex, availableGroups]);

  // Set default for shouldGenerateExpenses based on bank connection status
  useEffect(() => {
    const hasBankAccount =
      userProfile?.bank_accounts?.some((account) => account.active) || false;
    setShouldGenerateExpenses(!hasBankAccount);
  }, [userProfile?.bank_accounts]);

  // Initialize participants when group is selected
  useEffect(() => {
    if (currentGroupMembers.length > 0) {
      // Set default payer to current user
      const currentUserMember = currentGroupMembers.find(
        (member) => member.user_id === user?.id,
      );
      if (currentUserMember) {
        const payerIndex = currentGroupMembers.findIndex(
          (member) => member.user_id === user?.id,
        );
        setSelectedPayerIndex(new IndexPath(payerIndex));
      }

      // Initialize all members as participants for multi-member groups
      if (currentGroupMembers.length > 1) {
        const initialParticipants: ExpenseParticipant[] =
          currentGroupMembers.map((member) => ({
            user_id: member.user_id,
            username: member.username,
            share_amount: 1, // Set to 1 to make them active by default
          }));
        setParticipants(initialParticipants);
      } else {
        // For single-member groups, only include that member and make them active
        const singleParticipant: ExpenseParticipant[] = [
          {
            user_id: currentGroupMembers[0].user_id,
            username: currentGroupMembers[0].username,
            share_amount: 1, // Set to 1 to make them active by default
          },
        ];
        setParticipants(singleParticipant);
      }
    }
  }, [currentGroupMembers, user?.id]);

  const recalculateShares = useCallback(
    (newAmount?: string) => {
      const amountToUse = newAmount ?? amount;
      const totalAmount = Number(normalizeDecimalForParsing(amountToUse));
      if (!amountToUse || isNaN(totalAmount) || totalAmount <= 0) return;
      const splitMethod =
        SPLIT_METHODS[selectedSplitMethodIndex.row]?.value || "equal";

      if (splitMethod === "equal") {
        setParticipants((prev) => {
          const activeParticipants = prev.filter((p) => p.share_amount > 0);
          if (activeParticipants.length > 0) {
            const sharePerPerson = calculateEqualSplit(
              totalAmount,
              activeParticipants.length,
            );
            return prev.map((p) => {
              if (p.share_amount > 0) {
                return { ...p, share_amount: sharePerPerson };
              }
              return p; // Keep deselected participants at 0
            });
          }
          return prev; // No active participants, keep current state
        });
      }
    },
    [amount, selectedSplitMethodIndex.row],
  );

  useEffect(() => {
    if (participants.length > 0 && amount) {
      recalculateShares();
    }
  }, [amount, participants.length, recalculateShares]);

  const handleAmountChange = (newAmount: string) => {
    setAmount(newAmount);
    recalculateShares(newAmount);
  };

  const handleSplitMethodChange = (index: IndexPath) => {
    setSelectedSplitMethodIndex(index);
    recalculateShares();
  };

  const navigateBack = () => {
    router.back();
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert(t("validation.error"), t("validation.expenseNameRequired"));
      return false;
    }
    if (
      !amount.trim() ||
      isNaN(Number(normalizeDecimalForParsing(amount))) ||
      Number(normalizeDecimalForParsing(amount)) <= 0
    ) {
      Alert.alert(t("validation.error"), t("validation.validAmountRequired"));
      return false;
    }
    if (!selectedGroupIndex) {
      Alert.alert(t("validation.error"), t("validation.expenseGroupRequired"));
      return false;
    }
    if (!selectedPayerIndex) {
      Alert.alert(t("validation.error"), t("validation.payerRequired"));
      return false;
    }
    if (isRecurring && !recurringInterval.trim()) {
      Alert.alert(
        t("validation.error"),
        t("validation.recurringIntervalRequired"),
      );
      return false;
    }

    // Validate participants and shares
    const activeParticipants = participants.filter((p) => p.share_amount > 0);
    if (activeParticipants.length === 0) {
      Alert.alert(t("validation.error"), t("validation.participantRequired"));
      return false;
    }

    const totalShares = activeParticipants.reduce(
      (sum, p) => sum + p.share_amount,
      0,
    );
    const totalAmount = Number(normalizeDecimalForParsing(amount));
    if (Math.abs(totalShares - totalAmount) > 1) {
      Alert.alert(
        t("validation.error"),
        t("validation.sharesAmountMismatch", {
          totalShares: totalShares.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
        }),
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const selectedGroup = availableGroups[selectedGroupIndex!.row];
      const selectedCategory = selectedCategoryIndex
        ? availableCategories[selectedCategoryIndex.row]
        : { id: "other" };
      const selectedCurrency = CURRENCIES[selectedCurrencyIndex.row];
      const selectedPayer = currentGroupMembers[selectedPayerIndex!.row];
      const selectedSplitMethod = SPLIT_METHODS[selectedSplitMethodIndex.row];

      const activeParticipants = participants.filter((p) => p.share_amount > 0);

      if (isRecurring) {
        // Create recurring expense entry
        const today = date.toISOString().split("T")[0];
        const nextDueDate = calculateNextDueDate(recurringInterval, today);

        const recurringExpenseData: RecurringExpenseData = {
          name: name.trim(),
          description: description.trim(),
          amount: Number(normalizeDecimalForParsing(amount)),
          category: selectedCategory.id,
          currency: selectedCurrency.value,
          payer_user_id: selectedPayer.user_id,
          payer_username: selectedPayer.username,
          participants: activeParticipants,
          split_method: selectedSplitMethod.value as "equal" | "custom",
          interval: recurringInterval as
            | "daily"
            | "weekly"
            | "monthly"
            | "yearly",
          start_date: today,
          next_due_date: nextDueDate,
          last_generated_date: today,
          should_generate_expenses: shouldGenerateExpenses,
          is_active: true,
        };

        const recurringResult = await addRecurringExpense(
          selectedGroup.id,
          recurringExpenseData,
        );

        if (!recurringResult) {
          Alert.alert(
            t("alerts.error"),
            t("alerts.recurringExpenseCreateFailed"),
          );
          return;
        }

        // Create the initial expense for this period
        const expenseData: ExpenseData = {
          name: name.trim(),
          description: description.trim(),
          amount: Number(normalizeDecimalForParsing(amount)),
          date: today,
          category: selectedCategory.id,
          is_recurring: false,
          recurring_expense_id: recurringResult.id,
          currency: selectedCurrency.value,
          status: "completed",
          payer_user_id: selectedPayer.user_id,
          payer_username: selectedPayer.username,
          participants: activeParticipants,
          split_method: selectedSplitMethod.value as "equal" | "custom",
        };

        const expenseResult = await addExpense(selectedGroup.id, expenseData);
        if (expenseResult) {
          router.back();
        } else {
          Alert.alert(
            t("alerts.warning"),
            t("alerts.recurringExpensePartialSuccess"),
          );
        }
      } else {
        // Create regular one-time expense
        const expenseData: ExpenseData = {
          name: name.trim(),
          description: description.trim(),
          amount: Number(normalizeDecimalForParsing(amount)),
          date: date.toISOString().split("T")[0],
          category: selectedCategory.id,
          is_recurring: false,
          currency: selectedCurrency.value,
          status: "completed",
          payer_user_id: selectedPayer.user_id,
          payer_username: selectedPayer.username,
          participants: activeParticipants,
          split_method: selectedSplitMethod.value as "equal" | "custom",
        };

        const result = await addExpense(selectedGroup.id, expenseData);

        if (result) {
          router.back();
        } else {
          Alert.alert(t("alerts.error"), t("alerts.expenseAddFailed"));
        }
      }
    } catch (error) {
      console.error("Error adding expense:", error);
      Alert.alert(t("alerts.error"), t("alerts.unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    const totalAmount = Number(normalizeDecimalForParsing(amount)) || 0;
    const splitMethod =
      SPLIT_METHODS[selectedSplitMethodIndex.row]?.value || "equal";

    setParticipants((prev) => {
      const updated = prev.map((p) => {
        if (p.user_id === userId) {
          const isCurrentlyActive = p.share_amount > 0;
          return { ...p, share_amount: isCurrentlyActive ? 0 : 1 }; // Set to 1 when activating
        }
        return p;
      });

      if (splitMethod === "equal" && totalAmount > 0) {
        const activeParticipants = updated.filter((p) => p.share_amount > 0);
        if (activeParticipants.length > 0) {
          const sharePerPerson = calculateEqualSplit(
            totalAmount,
            activeParticipants.length,
          );
          return updated.map((p) => {
            if (p.share_amount > 0) {
              return { ...p, share_amount: sharePerPerson };
            }
            return p;
          });
        }
      }

      return updated;
    });
  };

  const updateCustomAmount = (userId: string, amountStr: string) => {
    const newAmount = parseFloat(amountStr) || 0;
    setParticipants((prev) =>
      prev.map((p) =>
        p.user_id === userId ? { ...p, share_amount: newAmount } : p,
      ),
    );
    setCustomAmounts((prev) => ({ ...prev, [userId]: amountStr }));
  };

  const renderBackAction = () => (
    <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={colors.icon} />
    </TouchableOpacity>
  );

  const CalendarIcon = (props: any) => (
    <Ionicons name="calendar-outline" size={20} color="#8F9BB3" />
  );

  const renderSharingSection = () => {
    if (currentGroupMembers.length <= 1) return null;

    const splitMethod =
      SPLIT_METHODS[selectedSplitMethodIndex.row]?.value || "equal";

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, shadowColor: colors.text },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("addExpense.expenseSharing")}
        </Text>

        <Select
          style={styles.input}
          label={t("addExpense.whoPaidLabel")}
          placeholder={t("addExpense.whoPaidPlaceholder")}
          value={
            selectedPayerIndex
              ? currentGroupMembers[selectedPayerIndex.row]?.username
              : ""
          }
          selectedIndex={selectedPayerIndex}
          onSelect={(index) => setSelectedPayerIndex(index as IndexPath)}
          status={selectedPayerIndex ? "basic" : "danger"}
        >
          {currentGroupMembers.map((member) => (
            <SelectItem key={member.user_id} title={member.username} />
          ))}
        </Select>

        <Select
          style={styles.input}
          label={t("addExpense.splitMethodLabel")}
          placeholder={t("addExpense.splitMethodPlaceholder")}
          value={
            selectedSplitMethodIndex
              ? t(
                  `addExpense.splitMethods.${SPLIT_METHODS[selectedSplitMethodIndex.row]?.value}`,
                )
              : ""
          }
          selectedIndex={selectedSplitMethodIndex}
          onSelect={(index) => handleSplitMethodChange(index as IndexPath)}
        >
          {SPLIT_METHODS.map((method) => (
            <SelectItem
              key={method.value}
              title={t(`addExpense.splitMethods.${method.value}`)}
            />
          ))}
        </Select>

        <Layout
          style={[
            styles.participantsContainer,
            { backgroundColor: colors.card, shadowColor: colors.text },
          ]}
        >
          <Text category="s1" style={styles.participantsTitle}>
            {t("addExpense.shareWith", {
              activeCount: participants.filter((p) => p.share_amount > 0)
                .length,
              totalCount: currentGroupMembers.length,
            })}
          </Text>

          {currentGroupMembers.map((member) => {
            const participant = participants.find(
              (p) => p.user_id === member.user_id,
            );
            const isActive = participant && participant.share_amount > 0;
            const shareAmount = participant?.share_amount || 0;

            return (
              <Layout
                key={member.user_id}
                style={[
                  styles.participantRow,
                  { backgroundColor: colors.card, shadowColor: colors.text },
                ]}
              >
                <CheckBox
                  checked={!!isActive}
                  onChange={() => toggleParticipant(member.user_id)}
                  style={styles.participantCheckbox}
                />
                <Layout
                  style={[
                    styles.participantInfo,
                    { backgroundColor: colors.card, shadowColor: colors.text },
                  ]}
                >
                  <Text category="s1">{member.username}</Text>
                  {member.user_id === user?.id && (
                    <Text category="c1" appearance="hint">
                      ({t("addExpense.you")})
                    </Text>
                  )}
                </Layout>
                {splitMethod === "custom" && isActive && (
                  <Input
                    style={styles.customAmountInput}
                    placeholder={t("addExpense.amountPlaceholder")}
                    value={
                      customAmounts[member.user_id] || shareAmount.toString()
                    }
                    onChangeText={(text) =>
                      updateCustomAmount(member.user_id, text)
                    }
                    keyboardType="decimal-pad"
                    size="small"
                  />
                )}
                {splitMethod !== "custom" && isActive && (
                  <Text category="s1" style={styles.shareAmount}>
                    {shareAmount.toFixed(2)}
                  </Text>
                )}
              </Layout>
            );
          })}
        </Layout>
      </View>
    );
  };

  if (availableGroups.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar
            barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
            backgroundColor={colors.background}
          />
          <TopNavigation
            title={t("addExpense.title")}
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
              <Ionicons name="folder-outline" size={32} color={colors.error} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t("addExpense.noGroupsTitle")}
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.icon }]}>
              {t("addExpense.noGroupsDescription")}
            </Text>
            <TouchableOpacity
              style={[styles.goBackButton, { backgroundColor: colors.primary }]}
              onPress={navigateBack}
            >
              <Text style={styles.goBackButtonText}>{t("common.goBack")}</Text>
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
          title={t("addExpense.title")}
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
              {t("addExpense.expenseDetails")}
            </Text>

            <Input
              style={styles.input}
              label={t("addExpense.nameLabel")}
              placeholder={t("addExpense.namePlaceholder")}
              value={name}
              onChangeText={setName}
              status={name.trim() ? "basic" : "danger"}
            />

            <Input
              style={styles.input}
              label={t("addExpense.descriptionLabel")}
              placeholder={t("addExpense.descriptionPlaceholder")}
              value={description}
              onChangeText={setDescription}
              multiline
              textStyle={{ minHeight: 64 }}
            />

            <Input
              style={styles.input}
              label={t("addExpense.amountLabel")}
              placeholder={t("addExpense.amountPlaceholder")}
              value={amount}
              onChangeText={handleAmountChange}
              keyboardType="decimal-pad"
              status={
                amount.trim() &&
                !isNaN(Number(normalizeDecimalForParsing(amount))) &&
                Number(normalizeDecimalForParsing(amount)) > 0
                  ? "basic"
                  : "danger"
              }
            />

            <Select
              style={styles.input}
              label={t("addExpense.expenseGroupLabel")}
              placeholder={t("addExpense.expenseGroupPlaceholder")}
              value={
                selectedGroupIndex
                  ? availableGroups[selectedGroupIndex.row]?.data?.name
                  : ""
              }
              selectedIndex={selectedGroupIndex}
              onSelect={(index) => setSelectedGroupIndex(index as IndexPath)}
              status={selectedGroupIndex ? "basic" : "danger"}
              caption={t("addExpense.expenseGroupCaption")}
            >
              {availableGroups.map((group) => (
                <SelectItem
                  key={group.id}
                  title={`${group.data?.name || "Unnamed Group"} (${group.data?.currency || "USD"})`}
                />
              ))}
            </Select>

            <Select
              style={styles.input}
              label={t("addExpense.currencyLabel")}
              placeholder={t("addExpense.currencyPlaceholder")}
              value={
                selectedCurrencyIndex
                  ? CURRENCIES[selectedCurrencyIndex.row]?.label
                  : ""
              }
              selectedIndex={selectedCurrencyIndex}
              onSelect={(index) => setSelectedCurrencyIndex(index as IndexPath)}
              caption={
                selectedGroupIndex
                  ? t("addExpense.currencyDefault", {
                      currency:
                        availableGroups[selectedGroupIndex.row]?.data
                          ?.currency || "USD",
                    })
                  : t("addExpense.currencySelectGroupFirst")
              }
            >
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.value} title={currency.label} />
              ))}
            </Select>

            <Datepicker
              style={styles.input}
              label={t("addExpense.dateLabel")}
              date={date}
              onSelect={setDate}
              accessoryRight={CalendarIcon}
            />

            <Select
              style={styles.input}
              label={t("addExpense.categoryLabel")}
              placeholder={t("addExpense.categoryPlaceholder")}
              value={
                selectedCategoryIndex
                  ? availableCategories[selectedCategoryIndex.row]?.displayName
                  : ""
              }
              selectedIndex={selectedCategoryIndex}
              onSelect={(index) => setSelectedCategoryIndex(index as IndexPath)}
              status="basic"
            >
              {availableCategories.map((category) => (
                <SelectItem key={category.id} title={category.displayName} />
              ))}
            </Select>
          </View>

          {renderSharingSection()}

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, shadowColor: colors.text },
            ]}
          >
            <Text category="h6" style={styles.sectionTitle}>
              {t("addExpense.additionalOptions")}
            </Text>

            <Layout style={styles.toggleContainer}>
              <Layout style={styles.toggleLabelContainer}>
                <Text category="s1">{t("addExpense.recurringExpense")}</Text>
                <Text category="c1" appearance="hint">
                  {t("addExpense.recurringExpenseDescription")}
                </Text>
              </Layout>
              <Toggle checked={isRecurring} onChange={setIsRecurring} />
            </Layout>

            {isRecurring && (
              <>
                <Select
                  style={styles.input}
                  label={t("addExpense.recurringIntervalLabel")}
                  placeholder={t("addExpense.recurringIntervalPlaceholder")}
                  value={
                    recurringInterval
                      ? t(`addExpense.recurringIntervals.${recurringInterval}`)
                      : ""
                  }
                  onSelect={(index) => {
                    const intervals = ["daily", "weekly", "monthly", "yearly"];
                    setRecurringInterval(intervals[(index as IndexPath).row]);
                  }}
                >
                  <SelectItem
                    title={t("addExpense.recurringIntervals.daily")}
                  />
                  <SelectItem
                    title={t("addExpense.recurringIntervals.weekly")}
                  />
                  <SelectItem
                    title={t("addExpense.recurringIntervals.monthly")}
                  />
                  <SelectItem
                    title={t("addExpense.recurringIntervals.yearly")}
                  />
                </Select>

                <Layout style={styles.toggleContainer}>
                  <Layout style={styles.toggleLabelContainer}>
                    <Text category="s1">
                      {t("addExpense.shouldGenerateExpenses")}
                    </Text>
                    <Text category="c1" appearance="hint">
                      {userProfile?.bank_accounts?.some(
                        (account) => account.active,
                      )
                        ? t(
                            "addExpense.shouldGenerateExpensesDescriptionWithBank",
                          )
                        : t("addExpense.shouldGenerateExpensesDescription")}
                    </Text>
                  </Layout>
                  <Toggle
                    checked={shouldGenerateExpenses}
                    onChange={setShouldGenerateExpenses}
                  />
                </Layout>
              </>
            )}
          </View>

          <Button
            style={styles.submitButton}
            size="large"
            onPress={handleSubmit}
            disabled={loading}
            accessoryLeft={
              loading
                ? () => <Spinner size="small" status="control" />
                : undefined
            }
          >
            {loading
              ? t("addExpense.addingExpense")
              : t("addExpense.addExpense")}
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
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 4,
  },
  toggleLabelContainer: {
    flex: 1,
    marginRight: 16,
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
  participantsContainer: {
    marginTop: 12,
  },
  participantsTitle: {
    fontSize: 16,
    marginBottom: 4,
    fontWeight: "600",
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  participantCheckbox: {
    marginRight: 16,
  },
  participantInfo: {
    flex: 1,
  },
  customAmountInput: {
    width: 90,
    marginLeft: 12,
    borderRadius: 8,
  },
  shareAmount: {
    marginLeft: 12,
    minWidth: 70,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "600",
  },
});
