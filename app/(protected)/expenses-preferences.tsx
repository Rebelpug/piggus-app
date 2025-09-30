import { Colors } from "@/constants/Colors";
import { useLocalization } from "@/context/LocalizationContext";
import { useProfile } from "@/context/ProfileContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { CURRENCIES } from "@/types/expense";
import { Ionicons } from "@expo/vector-icons";
import {
  IndexPath,
  Modal,
  Select,
  SelectItem,
  Spinner,
  Text,
  TopNavigation,
} from "@ui-kitten/components";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ExpensesPreferencesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { t } = useLocalization();
  const { userProfile, updateProfile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<IndexPath>(
    () => {
      const currentCurrency = userProfile?.profile?.defaultCurrency || "EUR";
      const index = CURRENCIES.findIndex((c) => c.value === currentCurrency);
      return new IndexPath(index >= 0 ? index : 0);
    },
  );

  const navigateBack = () => {
    router.back();
  };

  const handleUpdateCurrency = async () => {
    setLoading(true);
    try {
      const selectedCurrency = CURRENCIES[selectedCurrencyIndex.row];
      await updateProfile({
        defaultCurrency: selectedCurrency.value,
      });
      setCurrencyModalVisible(false);
    } catch (error) {
      console.error("Failed to update currency: ", (error as Error).message);
      Alert.alert(t("alerts.error"), t("alerts.currencyUpdateError"));
    } finally {
      setLoading(false);
    }
  };

  const renderBackAction = () => (
    <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={colors.icon} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TopNavigation
        title={t("profile.expensePreferences")}
        alignment="center"
        accessoryLeft={renderBackAction}
        style={{ backgroundColor: colors.background }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Expenses Preferences */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, shadowColor: colors.text },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("profile.expensePreferences")}
          </Text>

          <TouchableOpacity
            style={styles.preferenceRow}
            onPress={() => setCurrencyModalVisible(true)}
          >
            <View style={styles.infoLabel}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.success + "20" },
                ]}
              >
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={colors.success}
                />
              </View>
              <Text style={[styles.labelText, { color: colors.text }]}>
                {t("profile.preferredCurrency")}
              </Text>
            </View>
            <View style={styles.preferenceValue}>
              <Text style={[styles.currentValue, { color: colors.icon }]}>
                {CURRENCIES.find(
                  (c) => c.value === userProfile?.profile?.defaultCurrency,
                )?.label || "EUR (€)"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.icon} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.preferenceRow}
            onPress={() => router.push("/(protected)/budgeting-categories")}
          >
            <View style={styles.infoLabel}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.accent + "20" },
                ]}
              >
                <Ionicons name="grid-outline" size={20} color={colors.accent} />
              </View>
              <Text style={[styles.labelText, { color: colors.text }]}>
                {t("profile.categories")}
              </Text>
            </View>
            <View style={styles.preferenceValue}>
              <Text style={[styles.currentValue, { color: colors.icon }]}>
                {t("profile.customize")}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.icon} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.preferenceRow}
            onPress={() => router.push("/(protected)/payment-methods")}
          >
            <View style={styles.infoLabel}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.primary + "20" },
                ]}
              >
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.labelText, { color: colors.text }]}>
                {t("profile.paymentMethods")}
              </Text>
            </View>
            <View style={styles.preferenceValue}>
              <Text style={[styles.currentValue, { color: colors.icon }]}>
                {t("profile.customize")}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.icon} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Currency Selection Modal */}
      <Modal
        visible={currencyModalVisible}
        backdropStyle={styles.backdrop}
        onBackdropPress={() => setCurrencyModalVisible(false)}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {t("modals.selectDefaultCurrency")}
          </Text>
          <Text style={[styles.modalDescription, { color: colors.icon }]}>
            {t("modals.currencyDescription")}
          </Text>

          <Select
            style={styles.modalSelect}
            placeholder={t("modals.selectDefaultCurrency")}
            value={
              selectedCurrencyIndex
                ? CURRENCIES[selectedCurrencyIndex.row]?.label
                : ""
            }
            selectedIndex={selectedCurrencyIndex}
            onSelect={(index) => setSelectedCurrencyIndex(index as IndexPath)}
          >
            {CURRENCIES.map((currency) => (
              <SelectItem key={currency.value} title={currency.label} />
            ))}
          </Select>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.modalCancelButton,
                { borderColor: colors.border },
              ]}
              onPress={() => setCurrencyModalVisible(false)}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>
                {t("modals.cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.modalPrimaryButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleUpdateCurrency}
              disabled={loading}
            >
              <View style={styles.modalButtonContent}>
                {loading && <Spinner size="small" status="control" />}
                <Text style={[styles.modalButtonText, { color: "white" }]}>
                  {loading ? t("modals.updating") : t("modals.update")}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
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
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
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
  infoLabel: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  labelText: {
    fontSize: 16,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  preferenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  preferenceValue: {
    flexDirection: "row",
    alignItems: "center",
  },
  currentValue: {
    marginRight: 12,
    fontSize: 14,
  },
  backButton: {
    padding: 8,
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalCard: {
    minWidth: 320,
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  modalDescription: {
    marginBottom: 20,
    lineHeight: 22,
    fontSize: 14,
  },
  modalSelect: {
    marginBottom: 20,
    borderRadius: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  modalPrimaryButton: {
    // backgroundColor set dynamically
  },
  modalButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
