import React, { useState, useEffect } from "react";
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
  Select,
  SelectItem,
  IndexPath,
  Datepicker,
  Toggle,
  TopNavigation,
  Card,
  Spinner,
  CheckBox,
} from "@ui-kitten/components";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useExpense } from "@/context/ExpenseContext";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useLocalization } from "@/context/LocalizationContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import {
  RecurringExpenseData,
  RecurringExpenseWithDecryptedData,
  CURRENCIES,
  SPLIT_METHODS,
  ExpenseParticipant,
  calculateEqualSplit,
  computeExpenseCategories,
  getCategoryDisplayInfo,
  getMainCategories,
  getSubcategories,
  ExpenseCategory,
  computePaymentMethods,
} from "@/types/expense";
import { Ionicons } from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";

const getRecurringIntervals = (t: any) => [
  { value: "daily", label: t("editRecurringExpense.daily") },
  { value: "weekly", label: t("editRecurringExpense.weekly") },
  { value: "monthly", label: t("editRecurringExpense.monthly") },
  { value: "yearly", label: t("editRecurringExpense.yearly") },
];

export default function EditRecurringExpenseScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { user } = useAuth();
  const { recurringExpenseId, groupId } = useLocalSearchParams<{
    recurringExpenseId: string;
    groupId: string;
  }>();
  const { expensesGroups, recurringExpenses, updateRecurringExpense } =
    useExpense();
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

  // Compute payment methods with user's customizations
  const availablePaymentMethods = React.useMemo(
    () =>
      computePaymentMethods(
        userProfile?.profile?.budgeting?.paymentMethodOverrides,
      ),
    [userProfile?.profile?.budgeting?.paymentMethodOverrides],
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
  const [recurringExpense, setRecurringExpense] =
    useState<RecurringExpenseWithDecryptedData | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<
    IndexPath | undefined
  >();
  const [selectedPaymentMethodIndex, setSelectedPaymentMethodIndex] =
    useState<IndexPath>(new IndexPath(1)); // Default to credit card (index 1)
  const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<IndexPath>(
    new IndexPath(0),
  );
  const [selectedIntervalIndex, setSelectedIntervalIndex] = useState<IndexPath>(
    new IndexPath(2),
  ); // Default to monthly
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [hasEndDate, setHasEndDate] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [displayCategories, setDisplayCategories] =
    useState<(ExpenseCategory & { displayName: string })[]>(
      availableCategories,
    );

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

  // Load recurring expense data on mount
  useEffect(() => {
    if (
      !recurringExpenseId ||
      !groupId ||
      !recurringExpenses ||
      !expensesGroups
    )
      return;

    const foundRecurringExpense = recurringExpenses.find(
      (re) => re.id === recurringExpenseId && re.group_id === groupId,
    );
    if (!foundRecurringExpense) return;

    const group = expensesGroups.find((g) => g.id === groupId);
    if (!group) return;

    setRecurringExpense(foundRecurringExpense);
    setGroupMembers(group.members || []);

    // Populate form with existing recurring expense data
    setName(foundRecurringExpense.data.name);
    setDescription(foundRecurringExpense.data.description || "");
    setAmount(foundRecurringExpense.data.amount.toString());
    setStartDate(new Date(foundRecurringExpense.data.start_date));
    setIsActive(foundRecurringExpense.data.is_active);
    setParticipants(foundRecurringExpense.data.participants);
    setShouldGenerateExpenses(
      foundRecurringExpense.data.should_generate_expenses ?? true,
    );

    if (foundRecurringExpense.data.end_date) {
      setEndDate(new Date(foundRecurringExpense.data.end_date));
      setHasEndDate(true);
    }

    // Set category index - need to create a mutable copy for deleted categories
    const mutableCategories = [...availableCategories];
    let categoryIndex = mutableCategories.findIndex(
      (cat) => cat.id === foundRecurringExpense.data.category,
    );
    if (categoryIndex === -1) {
      const categoryInfo = getCategoryDisplayInfo(
        foundRecurringExpense.data.category,
        userProfile?.profile?.budgeting?.categoryOverrides,
      );
      categoryIndex = mutableCategories.length;
      mutableCategories.push({
        id: foundRecurringExpense.data.category,
        name: `${categoryInfo.name}${categoryInfo.isDeleted ? " (Deleted)" : ""}`,
        icon: categoryInfo.icon,
        displayName: `${categoryInfo.icon} ${categoryInfo.name}${categoryInfo.isDeleted ? " (Deleted)" : ""}`,
        parent: categoryInfo.parent,
      });
      // Update the display categories to include the deleted one
      setDisplayCategories(mutableCategories);
    }
    setSelectedCategoryIndex(new IndexPath(categoryIndex));

    // Set payment method index if available
    if (foundRecurringExpense.data.payment_method) {
      const paymentMethodIndex = availablePaymentMethods.findIndex(
        (pm) => pm.id === foundRecurringExpense.data.payment_method,
      );
      setSelectedPaymentMethodIndex(
        new IndexPath(paymentMethodIndex >= 0 ? paymentMethodIndex : 1),
      );
    }

    // Set currency index
    const currencyIndex = CURRENCIES.findIndex(
      (cur) => cur.value === foundRecurringExpense.data.currency,
    );
    setSelectedCurrencyIndex(
      new IndexPath(currencyIndex >= 0 ? currencyIndex : 0),
    );

    // Set interval index
    const recurringIntervals = getRecurringIntervals(t);
    const intervalIndex = recurringIntervals.findIndex(
      (int) => int.value === foundRecurringExpense.data.interval,
    );
    setSelectedIntervalIndex(
      new IndexPath(intervalIndex >= 0 ? intervalIndex : 2),
    );

    // Set payer index
    const payerIndex = group.members.findIndex(
      (m) => m.user_id === foundRecurringExpense.data.payer_user_id,
    );
    setSelectedPayerIndex(
      payerIndex >= 0 ? new IndexPath(payerIndex) : undefined,
    );

    // Set split method index
    const splitMethodIndex = SPLIT_METHODS.findIndex(
      (sm) => sm.value === foundRecurringExpense.data.split_method,
    );
    setSelectedSplitMethodIndex(
      new IndexPath(splitMethodIndex >= 0 ? splitMethodIndex : 0),
    );

    // Initialize custom amounts for custom split
    if (foundRecurringExpense.data.split_method === "custom") {
      const amounts: { [userId: string]: string } = {};
      foundRecurringExpense.data.participants.forEach((p) => {
        amounts[p.user_id] = p.share_amount.toString();
      });
      setCustomAmounts(amounts);
    }
  }, [
    recurringExpenseId,
    groupId,
    recurringExpenses,
    expensesGroups,
    availableCategories,
    availablePaymentMethods,
    userProfile?.profile?.budgeting?.categoryOverrides,
  ]);
  // ESLint disabled: 't' is stable from useLocalization context
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Update displayCategories when availableCategories changes
  useEffect(() => {
    setDisplayCategories(availableCategories);
  }, [availableCategories]);

  const navigateBack = () => {
    router.back();
  };

  const handleSave = async () => {
    if (!recurringExpense || !groupId) return;

    // Validation
    if (!name.trim()) {
      Alert.alert(
        t("editRecurringExpense.error"),
        t("editRecurringExpense.enterRecurringExpenseName"),
      );
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert(
        t("editRecurringExpense.error"),
        t("editRecurringExpense.enterValidAmount"),
      );
      return;
    }

    if (!selectedPayerIndex) {
      Alert.alert(
        t("editRecurringExpense.error"),
        t("editRecurringExpense.selectPayer"),
      );
      return;
    }

    if (participants.length === 0) {
      Alert.alert(
        t("editRecurringExpense.error"),
        t("editRecurringExpense.selectAtLeastOneParticipant"),
      );
      return;
    }

    // Validate custom amounts
    if (selectedSplitMethodIndex?.row === 1) {
      // Custom amounts
      const totalCustomAmount = participants.reduce((sum, p) => {
        const customAmount = parseFloat(customAmounts[p.user_id] || "0");
        return sum + (isNaN(customAmount) ? 0 : customAmount);
      }, 0);

      if (Math.abs(totalCustomAmount - parseFloat(amount)) > 0.01) {
        Alert.alert(
          t("editRecurringExpense.error"),
          t("editRecurringExpense.customAmountsMustMatch"),
        );
        return;
      }
    }

    setLoading(true);

    try {
      // Handle category selection - default to "other" if none selected or category not found
      let selectedCategory;
      if (
        selectedCategoryIndex &&
        displayCategories[selectedCategoryIndex.row]
      ) {
        selectedCategory = displayCategories[selectedCategoryIndex.row];
      } else {
        selectedCategory = { id: "other" };
      }
      const selectedCurrency = CURRENCIES[selectedCurrencyIndex.row];
      const recurringIntervals = getRecurringIntervals(t);
      const selectedInterval = recurringIntervals[selectedIntervalIndex.row];
      const selectedPayer = groupMembers[selectedPayerIndex.row];
      const selectedSplitMethod = SPLIT_METHODS[selectedSplitMethodIndex.row];
      const selectedPaymentMethod =
        availablePaymentMethods[selectedPaymentMethodIndex.row];

      // Calculate participant shares
      let finalParticipants: ExpenseParticipant[] = [];
      const amountNum = parseFloat(amount);

      if (selectedSplitMethod.value === "equal") {
        const shareAmount = calculateEqualSplit(amountNum, participants.length);
        finalParticipants = participants.map((p) => ({
          ...p,
          share_amount: shareAmount,
        }));
      } else if (selectedSplitMethod.value === "custom") {
        finalParticipants = participants.map((p) => ({
          ...p,
          share_amount: parseFloat(customAmounts[p.user_id] || "0"),
        }));
      }

      const updatedRecurringExpenseData: RecurringExpenseData = {
        name: name.trim(),
        description: description.trim(),
        amount: amountNum,
        category: selectedCategory.id,
        payment_method: selectedPaymentMethod.id,
        currency: selectedCurrency.value,
        payer_user_id: selectedPayer.user_id,
        payer_username: selectedPayer.username,
        participants: finalParticipants,
        split_method: selectedSplitMethod.value as "equal" | "custom",
        interval: selectedInterval.value as
          | "daily"
          | "weekly"
          | "monthly"
          | "yearly",
        start_date: startDate.toISOString().split("T")[0],
        end_date:
          hasEndDate && endDate
            ? endDate.toISOString().split("T")[0]
            : undefined,
        next_due_date: recurringExpense.data.next_due_date, // Keep existing next due date
        last_generated_date: recurringExpense.data.last_generated_date,
        should_generate_expenses: shouldGenerateExpenses,
        is_active: isActive,
      };

      const updatedRecurringExpense: RecurringExpenseWithDecryptedData = {
        ...recurringExpense,
        data: updatedRecurringExpenseData,
      };

      const result = await updateRecurringExpense(
        groupId,
        updatedRecurringExpense,
      );

      if (result?.data) {
        router.back();
      } else {
        Alert.alert(
          t("editRecurringExpense.error"),
          t("editRecurringExpense.updateRecurringExpenseFailed"),
        );
      }
    } catch (error: any) {
      console.error("Failed to update recurring expense:", error);
      Alert.alert(
        t("editRecurringExpense.error"),
        error.message || t("editRecurringExpense.updateRecurringExpenseFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleParticipantToggle = (member: any) => {
    setParticipants((prev) => {
      const existingParticipant = prev.find(
        (p) => p.user_id === member.user_id,
      );

      if (existingParticipant) {
        // Toggle between active (share_amount > 0) and inactive (share_amount = 0)
        const isCurrentlyActive = existingParticipant.share_amount > 0;
        return prev.map((p) =>
          p.user_id === member.user_id
            ? { ...p, share_amount: isCurrentlyActive ? 0 : 1 }
            : p,
        );
      } else {
        // Add new participant as active
        const newParticipant: ExpenseParticipant = {
          user_id: member.user_id,
          username: member.username,
          share_amount: 1, // Start as active
        };
        return [...prev, newParticipant];
      }
    });

    // Handle custom amounts
    const existingParticipant = participants.find(
      (p) => p.user_id === member.user_id,
    );
    if (existingParticipant && existingParticipant.share_amount > 0) {
      // Deactivating - remove from custom amounts
      setCustomAmounts((prev) => {
        const newAmounts = { ...prev };
        delete newAmounts[member.user_id];
        return newAmounts;
      });
    } else if (selectedSplitMethodIndex.row === 1) {
      // Activating and custom split - initialize custom amount
      setCustomAmounts((prev) => ({
        ...prev,
        [member.user_id]: "0",
      }));
    }
  };

  const handleCustomAmountChange = (userId: string, value: string) => {
    setCustomAmounts((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  // Update participant shares when split method or amount changes
  useEffect(() => {
    if (!amount || participants.length === 0) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return;

    if (selectedSplitMethodIndex.row === 0) {
      // Equal split
      const shareAmount = calculateEqualSplit(amountNum, participants.length);
      setParticipants((prev) =>
        prev.map((p) => ({
          ...p,
          share_amount: shareAmount,
        })),
      );
    }
  }, [selectedSplitMethodIndex, amount, participants.length]);

  if (!recurringExpense) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <TopNavigation
          title={t("editRecurringExpense.title")}
          alignment="center"
          accessoryLeft={() => (
            <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          style={{ backgroundColor: colors.background }}
        />
        <Layout style={styles.loadingContainer}>
          <Text category="h6">
            {t("editRecurringExpense.recurringExpenseNotFound")}
          </Text>
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
        title={t("editRecurringExpense.title")}
        alignment="center"
        accessoryLeft={() => (
          <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        accessoryRight={() => (
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            disabled={loading}
          >
            {loading ? (
              <Spinner size="small" />
            ) : (
              <Text style={[styles.saveButtonText, { color: colors.primary }]}>
                {t("editRecurringExpense.save")}
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
          {/* Basic Information */}
          <Card style={[styles.formCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("editRecurringExpense.basicInformation")}
            </Text>

            <Input
              label={t("editRecurringExpense.name")}
              placeholder={t("editRecurringExpense.enterRecurringExpenseName")}
              value={name}
              onChangeText={setName}
              style={styles.input}
            />

            <Input
              label={t("editRecurringExpense.description")}
              placeholder={t("editRecurringExpense.enterDescription")}
              value={description}
              onChangeText={setDescription}
              multiline={true}
              textStyle={{ minHeight: 64 }}
              style={styles.input}
            />

            <Input
              label={t("editRecurringExpense.amount")}
              placeholder={t("editRecurringExpense.amountPlaceholder")}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <Select
              label={t("editRecurringExpense.category")}
              placeholder={t("editRecurringExpense.selectCategory")}
              selectedIndex={selectedCategoryIndex}
              onSelect={(index) => setSelectedCategoryIndex(index as IndexPath)}
              value={
                selectedCategoryIndex
                  ? displayCategories[selectedCategoryIndex.row]?.displayName
                  : ""
              }
              style={styles.input}
            >
              {displayCategories.map((category, index) => (
                <SelectItem key={index} title={category.displayName} />
              ))}
            </Select>

            <Select
              label={t("editRecurringExpense.paymentMethod")}
              placeholder={t("editRecurringExpense.selectPaymentMethod")}
              selectedIndex={selectedPaymentMethodIndex}
              onSelect={(index) =>
                setSelectedPaymentMethodIndex(index as IndexPath)
              }
              value={
                availablePaymentMethods[selectedPaymentMethodIndex.row]
                  ? `${availablePaymentMethods[selectedPaymentMethodIndex.row].icon} ${availablePaymentMethods[selectedPaymentMethodIndex.row].name}`
                  : ""
              }
              style={styles.input}
            >
              {availablePaymentMethods.map((method, index) => (
                <SelectItem
                  key={index}
                  title={`${method.icon} ${method.name}`}
                />
              ))}
            </Select>

            <Select
              label={t("editRecurringExpense.currency")}
              selectedIndex={selectedCurrencyIndex}
              onSelect={(index) => setSelectedCurrencyIndex(index as IndexPath)}
              value={CURRENCIES[selectedCurrencyIndex.row]?.label}
              style={styles.input}
            >
              {CURRENCIES.map((currency, index) => (
                <SelectItem key={index} title={currency.label} />
              ))}
            </Select>
          </Card>

          {/* Schedule */}
          <Card style={[styles.formCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("editRecurringExpense.schedule")}
            </Text>

            <Select
              label={t("editRecurringExpense.frequency")}
              selectedIndex={selectedIntervalIndex}
              onSelect={(index) => setSelectedIntervalIndex(index as IndexPath)}
              value={getRecurringIntervals(t)[selectedIntervalIndex.row]?.label}
              style={styles.input}
            >
              {getRecurringIntervals(t).map((interval, index) => (
                <SelectItem key={index} title={interval.label} />
              ))}
            </Select>

            <Datepicker
              label={t("editRecurringExpense.startDate")}
              date={startDate}
              onSelect={setStartDate}
              style={styles.input}
            />

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>
                {t("editRecurringExpense.setEndDate")}
              </Text>
              <Toggle checked={hasEndDate} onChange={setHasEndDate} />
            </View>

            {hasEndDate && (
              <Datepicker
                label={t("editRecurringExpense.endDate")}
                date={endDate}
                onSelect={setEndDate}
                style={styles.input}
              />
            )}

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>
                {t("editRecurringExpense.active")}
              </Text>
              <Toggle checked={isActive} onChange={setIsActive} />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelContainer}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>
                  {t("editRecurringExpense.generateExpenses")}
                </Text>
                <Text
                  category="c1"
                  appearance="hint"
                  style={styles.toggleDescription}
                >
                  {userProfile?.bank_accounts?.some((account) => account.active)
                    ? t("editRecurringExpense.notRecommendedBankConnected")
                    : t("editRecurringExpense.automaticallyCreateExpenses")}
                </Text>
              </View>
              <Toggle
                checked={shouldGenerateExpenses}
                onChange={setShouldGenerateExpenses}
              />
            </View>
          </Card>

          {/* Payment Details - Only show if group has multiple members */}
          {groupMembers.length > 1 && (
            <Card style={[styles.formCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("editRecurringExpense.paymentDetails")}
              </Text>

              <Select
                label={t("editRecurringExpense.paidBy")}
                placeholder={t("editRecurringExpense.selectWhoPays")}
                selectedIndex={selectedPayerIndex}
                onSelect={(index) => setSelectedPayerIndex(index as IndexPath)}
                value={
                  selectedPayerIndex
                    ? groupMembers[selectedPayerIndex.row]?.username
                    : ""
                }
                style={styles.input}
              >
                {groupMembers.map((member, index) => (
                  <SelectItem
                    key={index}
                    title={`${member.username}${member.user_id === user?.id ? " (You)" : ""}`}
                  />
                ))}
              </Select>

              <Select
                label={t("editRecurringExpense.splitMethod")}
                selectedIndex={selectedSplitMethodIndex}
                onSelect={(index) =>
                  setSelectedSplitMethodIndex(index as IndexPath)
                }
                value={SPLIT_METHODS[selectedSplitMethodIndex.row]?.label}
                style={styles.input}
              >
                {SPLIT_METHODS.map((method, index) => (
                  <SelectItem key={index} title={method.label} />
                ))}
              </Select>
            </Card>
          )}

          {/* Participants - Only show if group has multiple members */}
          {groupMembers.length > 1 && (
            <Card style={[styles.formCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("editRecurringExpense.participants")}
              </Text>

              {groupMembers.map((member, index) => {
                const participant = participants.find(
                  (p) => p.user_id === member.user_id,
                );
                const isActive = participant && participant.share_amount > 0;
                const isCurrentUser = member.user_id === user?.id;

                return (
                  <View key={member.user_id} style={styles.participantRow}>
                    <View style={styles.participantInfo}>
                      <CheckBox
                        checked={!!isActive}
                        onChange={() => handleParticipantToggle(member)}
                      />
                      <Text
                        style={[styles.participantName, { color: colors.text }]}
                      >
                        {member.username}
                        {isCurrentUser ? " (You)" : ""}
                      </Text>
                    </View>

                    {isActive && selectedSplitMethodIndex.row === 1 && (
                      <Input
                        placeholder={t(
                          "editRecurringExpense.amountPlaceholder",
                        )}
                        value={customAmounts[member.user_id] || ""}
                        onChangeText={(value) =>
                          handleCustomAmountChange(member.user_id, value)
                        }
                        keyboardType="decimal-pad"
                        style={styles.customAmountInput}
                      />
                    )}

                    {isActive && selectedSplitMethodIndex.row === 0 && (
                      <Text
                        style={[styles.shareAmount, { color: colors.text }]}
                      >
                        {participant?.share_amount.toFixed(2) || "0.00"}
                      </Text>
                    )}
                  </View>
                );
              })}
            </Card>
          )}

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
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  toggleLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  toggleDescription: {
    marginTop: 4,
    lineHeight: 16,
  },
  participantRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  participantInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  customAmountInput: {
    width: 100,
  },
  shareAmount: {
    fontSize: 14,
    fontWeight: "500",
    minWidth: 60,
    textAlign: "right",
  },
  bottomPadding: {
    height: 32,
  },
});
