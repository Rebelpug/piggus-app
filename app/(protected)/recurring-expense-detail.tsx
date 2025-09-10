import React, { useEffect, useState } from "react";
import { StyleSheet, ScrollView, Alert, View } from "react-native";
import {
  Layout,
  Text,
  TopNavigation,
  TopNavigationAction,
  Divider,
  Card,
  Button,
} from "@ui-kitten/components";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useExpense } from "@/context/ExpenseContext";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useLocalization } from "@/context/LocalizationContext";
import {
  RecurringExpenseWithDecryptedData,
  getCategoryDisplayInfo,
  getPaymentMethodDisplayInfo,
} from "@/types/expense";

import { ThemedView } from "@/components/ThemedView";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";

export default function RecurringExpenseDetailScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { user } = useAuth();
  const { recurringExpenseId, groupId } = useLocalSearchParams<{
    recurringExpenseId: string;
    groupId: string;
  }>();
  const { expensesGroups, recurringExpenses, deleteRecurringExpense } =
    useExpense();
  const { userProfile } = useProfile();
  const { t } = useLocalization();
  const [recurringExpense, setRecurringExpense] =
    useState<RecurringExpenseWithDecryptedData | null>(null);
  const [groupName, setGroupName] = useState<string>("");
  const [groupMembers, setGroupMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!recurringExpenseId || !groupId || !recurringExpenses) return;

    const foundRecurringExpense = recurringExpenses.find(
      (re) => re.id === recurringExpenseId && re.group_id === groupId,
    );
    if (foundRecurringExpense) {
      setRecurringExpense(foundRecurringExpense);
    }

    const group = expensesGroups?.find((g) => g.id === groupId);
    if (group) {
      setGroupName(group.data?.name || t("common.unknownGroup"));
      setGroupMembers(group.members || []);
    }
  }, [recurringExpenseId, groupId, recurringExpenses, expensesGroups]);

  const navigateBack = () => {
    router.back();
  };

  const handleEdit = () => {
    router.push({
      pathname: "/(protected)/edit-recurring-expense",
      params: {
        recurringExpenseId: recurringExpenseId,
        groupId: groupId,
      },
    });
  };

  const handleDelete = () => {
    Alert.alert(
      t("recurringExpenseDetail.delete"),
      t("recurringExpenseDetail.deleteRecurringExpenseConfirm"),
      [
        { text: t("recurringExpenseDetail.cancel"), style: "cancel" },
        {
          text: t("recurringExpenseDetail.deleteButton"),
          style: "destructive",
          onPress: async () => {
            try {
              if (!groupId || !recurringExpenseId) return;

              await deleteRecurringExpense(groupId, recurringExpenseId);
              router.back();
            } catch (error) {
              console.error("Failed to delete recurring expense:", error);
              Alert.alert(
                t("recurringExpenseDetail.error"),
                t("recurringExpenseDetail.deleteRecurringExpenseFailed"),
              );
            }
          },
        },
      ],
    );
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)}`;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getIntervalDisplay = (interval: string) => {
    const intervalMap = {
      daily: t("recurringExpenseDetail.daily"),
      weekly: t("recurringExpenseDetail.weekly"),
      monthly: t("recurringExpenseDetail.monthly"),
      yearly: t("recurringExpenseDetail.yearly"),
    };
    return intervalMap[interval as keyof typeof intervalMap] || interval;
  };

  const formatNextDueDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const diffTime = date.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return t("recurringExpenseDetail.overdue");
      } else if (diffDays === 0) {
        return t("recurringExpenseDetail.dueToday");
      } else if (diffDays === 1) {
        return t("recurringExpenseDetail.dueTomorrow");
      } else if (diffDays <= 7) {
        return t("recurringExpenseDetail.dueInDays", { days: diffDays });
      } else {
        return formatDate(dateString);
      }
    } catch {
      return dateString;
    }
  };

  const getCategoryInfo = (categoryId: string) => {
    return getCategoryDisplayInfo(
      categoryId,
      userProfile?.profile?.budgeting?.categoryOverrides,
    );
  };

  const getUsernameFromId = (userId: string) => {
    const member = groupMembers.find((m) => m.user_id === userId);
    return member ? member.username : t("recurringExpenseDetail.unknownUser");
  };

  const userShare =
    recurringExpense?.data.participants.find((p) => p.user_id === user?.id)
      ?.share_amount || 0;
  const isPayer = recurringExpense?.data.payer_user_id === user?.id;

  const renderBackAction = () => (
    <TopNavigationAction
      icon={(props) => (
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      )}
      onPress={navigateBack}
    />
  );

  const renderEditAction = () => (
    <TopNavigationAction
      icon={(props) => (
        <Ionicons name="pencil-outline" size={24} color={colors.text} />
      )}
      onPress={handleEdit}
    />
  );

  if (!recurringExpense) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <TopNavigation
          title={t("recurringExpenseDetail.title")}
          alignment="center"
          accessoryLeft={renderBackAction}
          style={{ backgroundColor: colors.background }}
        />
        <Layout style={styles.loadingContainer}>
          <Text category="h6">{t("recurringExpenseDetail.recurringExpenseNotFound")}</Text>
        </Layout>
      </SafeAreaView>
    );
  }

  const categoryInfo = getCategoryInfo(recurringExpense.data.category);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TopNavigation
        title={t("recurringExpenseDetail.title")}
        alignment="center"
        accessoryLeft={renderBackAction}
        accessoryRight={renderEditAction}
        style={{ backgroundColor: colors.background }}
      />
      <Divider />

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
          {/* Header Card */}
          <Card style={[styles.headerCard, { backgroundColor: colors.card }]}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Text style={[styles.expenseTitle, { color: colors.text }]}>
                  {recurringExpense.data.name}
                </Text>
                <Text style={[styles.groupName, { color: colors.icon }]}>
                  {groupName} •{" "}
                  {getIntervalDisplay(recurringExpense.data.interval)}
                </Text>
                <View style={styles.statusBadge}>
                  <View
                    style={[
                      styles.statusIndicator,
                      {
                        backgroundColor: recurringExpense.data.is_active
                          ? "#4CAF50"
                          : "#757575",
                      },
                    ]}
                  />
                  <Text style={[styles.statusText, { color: colors.text }]}>
                    {recurringExpense.data.is_active ? t("recurringExpenseDetail.active") : t("recurringExpenseDetail.inactive")}
                  </Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                <Text style={[styles.amount, { color: colors.text }]}>
                  {formatCurrency(userShare, recurringExpense.data.currency)}
                </Text>
                {recurringExpense.data.participants.length > 1 && (
                  <Text style={[styles.totalAmount, { color: colors.icon }]}>
                    {t("expenseDetail.of")}{" "}
                    {formatCurrency(
                      recurringExpense.data.amount,
                      recurringExpense.data.currency,
                    )}
                  </Text>
                )}
                <View
                  style={[
                    styles.recurringBadge,
                    { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <Ionicons name="repeat" size={12} color={colors.primary} />
                  <Text
                    style={[styles.recurringText, { color: colors.primary }]}
                  >
                    {t("recurringExpenseDetail.recurring")}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Schedule Information */}
          <Card style={[styles.detailCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("recurringExpenseDetail.schedule")}
            </Text>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.icon }]}>
                {t("recurringExpenseDetail.frequency")}
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {getIntervalDisplay(recurringExpense.data.interval)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.icon }]}>
                {t("recurringExpenseDetail.startDate")}
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatDate(recurringExpense.data.start_date)}
              </Text>
            </View>
            {recurringExpense.data.end_date && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>
                  {t("recurringExpenseDetail.endDate")}
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatDate(recurringExpense.data.end_date)}
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.icon }]}>
                {t("recurringExpenseDetail.nextDue")}
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  {
                    color: recurringExpense.data.is_active
                      ? colors.primary
                      : colors.icon,
                  },
                ]}
              >
                {recurringExpense.data.is_active
                  ? formatNextDueDate(recurringExpense.data.next_due_date)
                  : t("recurringExpenseDetail.inactive")}
              </Text>
            </View>
            {recurringExpense.data.last_generated_date && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>
                  {t("recurringExpenseDetail.lastGenerated")}
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatDate(recurringExpense.data.last_generated_date)}
                </Text>
              </View>
            )}
          </Card>

          {/* Expense Details */}
          <Card style={[styles.detailCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("recurringExpenseDetail.details")}
            </Text>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.icon }]}>
                {t("recurringExpenseDetail.category")}
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {categoryInfo.icon} {categoryInfo.name}
                {categoryInfo.isDeleted ? t("recurringExpenseDetail.deleted") : ""}
              </Text>
            </View>
            {recurringExpense.data.payment_method && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>
                  {t("expenseDetail.paymentMethod")}
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {(() => {
                    const paymentMethodInfo = getPaymentMethodDisplayInfo(
                      recurringExpense.data.payment_method,
                      userProfile?.profile?.budgeting?.paymentMethodOverrides,
                    );
                    return `${paymentMethodInfo.icon} ${paymentMethodInfo.name}`;
                  })()}
                </Text>
              </View>
            )}
            {recurringExpense.data.description && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>
                  {t("recurringExpenseDetail.description")}
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {recurringExpense.data.description}
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.icon }]}>
                {t("recurringExpenseDetail.amount")}
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatCurrency(
                  recurringExpense.data.amount,
                  recurringExpense.data.currency,
                )}
              </Text>
            </View>
            {groupMembers.length > 1 && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>
                  {t("recurringExpenseDetail.splitMethod")}
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {recurringExpense.data.split_method === "equal"
                    ? t("recurringExpenseDetail.splitEqually")
                    : recurringExpense.data.split_method === "custom"
                      ? t("recurringExpenseDetail.customAmounts")
                      : t("recurringExpenseDetail.byPercentage")}
                </Text>
              </View>
            )}
          </Card>

          {/* Participants - Only show if more than one group member */}
          {groupMembers.length > 1 && (
            <Card style={[styles.detailCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("recurringExpenseDetail.participants")}
              </Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>
                  {t("recurringExpenseDetail.paidBy")}
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {getUsernameFromId(recurringExpense.data.payer_user_id)}
                  {isPayer && t("recurringExpenseDetail.you")}
                </Text>
              </View>
              {recurringExpense.data.participants.map((participant, index) => (
                <View key={participant.user_id} style={styles.participantRow}>
                  <Text
                    style={[styles.participantName, { color: colors.text }]}
                  >
                    {getUsernameFromId(participant.user_id)}
                    {participant.user_id === user?.id && t("recurringExpenseDetail.you")}
                  </Text>
                  <Text
                    style={[styles.participantAmount, { color: colors.text }]}
                  >
                    {formatCurrency(
                      participant.share_amount,
                      recurringExpense.data.currency,
                    )}
                  </Text>
                </View>
              ))}
            </Card>
          )}

          {/* Single group member - show simplified payer info */}
          {groupMembers.length >= 1 && (
            <Card style={[styles.detailCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("recurringExpenseDetail.payment")}
              </Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>
                  {t("recurringExpenseDetail.paidBy")}
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {getUsernameFromId(recurringExpense.data.payer_user_id)}
                  {isPayer && t("recurringExpenseDetail.you")}
                </Text>
              </View>
            </Card>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              style={[styles.actionButton, styles.editButton]}
              appearance="outline"
              status="primary"
              accessoryLeft={() => (
                <Ionicons
                  name="pencil-outline"
                  size={20}
                  color={colors.primary}
                />
              )}
              onPress={handleEdit}
            >
              {t("recurringExpenseDetail.edit")}
            </Button>
            <Button
              style={[styles.actionButton, styles.deleteButton]}
              appearance="outline"
              status="danger"
              accessoryLeft={() => (
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              )}
              onPress={handleDelete}
            >
              {t("recurringExpenseDetail.delete")}
            </Button>
          </View>
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  expenseTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  groupName: {
    fontSize: 14,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  amount: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 12,
    marginBottom: 8,
  },
  recurringBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recurringText: {
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
  },
  detailCard: {
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
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  participantRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    marginBottom: 4,
  },
  participantName: {
    fontSize: 14,
    flex: 1,
  },
  participantAmount: {
    fontSize: 14,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  editButton: {},
  deleteButton: {},
});
