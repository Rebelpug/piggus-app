import React, { useEffect, useState } from "react";
import { StyleSheet, ScrollView, Alert, TouchableOpacity } from "react-native";
import {
  Layout,
  Text,
  Input,
  Button,
  Select,
  SelectItem,
  IndexPath,
  TopNavigation,
  Card,
  Spinner,
} from "@ui-kitten/components";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useExpense } from "@/context/ExpenseContext";
import { ExpenseGroupData, CURRENCIES } from "@/types/expense";
import { Ionicons } from "@expo/vector-icons";
import { useProfile } from "@/context/ProfileContext";
import { ThemedView } from "@/components/ThemedView";
import { useLocalization } from "@/context/LocalizationContext";

export default function CreateGroupScreen() {
  const router = useRouter();
  const { userProfile } = useProfile();
  const { createExpensesGroup } = useExpense();
  const { t } = useLocalization();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<
    IndexPath | undefined
  >(undefined);

  useEffect(() => {
    if (userProfile?.profile?.defaultCurrency) {
      const currencyIndex = CURRENCIES.findIndex(
        (currency) => currency.value === userProfile.profile.defaultCurrency,
      );
      setSelectedCurrencyIndex(
        currencyIndex >= 0 ? new IndexPath(currencyIndex) : new IndexPath(0),
      );
    } else {
      setSelectedCurrencyIndex(new IndexPath(0));
    }
  }, [userProfile]);

  const navigateBack = () => {
    router.back();
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert(
        t("createGroup.validationError"),
        t("createGroup.groupNameRequired"),
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (!selectedCurrencyIndex) {
        Alert.alert(t("createGroup.error"), t("createGroup.waitForCurrency"));
        return;
      }

      const selectedCurrency = CURRENCIES[selectedCurrencyIndex.row];

      const groupData: ExpenseGroupData = {
        name: name.trim(),
        description: description.trim(),
        private: false,
        currency: selectedCurrency.value,
      };

      await createExpensesGroup(groupData);
      router.back();
    } catch (error) {
      console.error("Error creating group:", error);
      Alert.alert(t("createGroup.error"), t("createGroup.createGroupFailed"));
    } finally {
      setLoading(false);
    }
  };

  const renderBackAction = () => (
    <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TopNavigation
          title={t("createGroup.title")}
          alignment="center"
          accessoryLeft={renderBackAction}
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.card}>
            <Text category="h6" style={styles.sectionTitle}>
              {t("createGroup.groupDetails")}
            </Text>

            <Input
              style={styles.input}
              label={t("createGroup.groupName")}
              placeholder={t("createGroup.enterGroupName")}
              value={name}
              onChangeText={setName}
              status={name.trim() ? "basic" : "danger"}
              caption={t("createGroup.requiredField")}
            />

            <Input
              style={styles.input}
              label={t("createGroup.description")}
              placeholder={t("createGroup.enterGroupDescription")}
              value={description}
              onChangeText={setDescription}
              multiline
              textStyle={{ minHeight: 64 }}
              caption={t("createGroup.describePurpose")}
            />

            <Select
              style={styles.input}
              label={t("createGroup.defaultCurrency")}
              placeholder={t("createGroup.selectCurrency")}
              value={
                selectedCurrencyIndex
                  ? CURRENCIES[selectedCurrencyIndex.row]?.label
                  : t("createGroup.loading")
              }
              selectedIndex={selectedCurrencyIndex}
              onSelect={(index) => setSelectedCurrencyIndex(index as IndexPath)}
              caption={t("createGroup.currencyDescription")}
            >
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.value} title={currency.label} />
              ))}
            </Select>
          </Card>

          <Card style={styles.card}>
            <Text category="h6" style={styles.sectionTitle}>
              {t("createGroup.groupFeatures")}
            </Text>

            <Layout style={styles.featureItem}>
              <Ionicons
                name="people-outline"
                size={20}
                color="#8F9BB3"
                style={styles.featureIcon}
              />
              <Layout style={styles.featureText}>
                <Text category="s1">{t("createGroup.sharedExpenses")}</Text>
                <Text category="c1" appearance="hint">
                  {t("createGroup.sharedExpensesDescription")}
                </Text>
              </Layout>
            </Layout>

            <Layout style={styles.featureItem}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#8F9BB3"
                style={styles.featureIcon}
              />
              <Layout style={styles.featureText}>
                <Text category="s1">{t("createGroup.endToEndEncryption")}</Text>
                <Text category="c1" appearance="hint">
                  {t("createGroup.encryptionDescription")}
                </Text>
              </Layout>
            </Layout>

            <Layout style={styles.featureItem}>
              <Ionicons
                name="stats-chart-outline"
                size={20}
                color="#8F9BB3"
                style={styles.featureIcon}
              />
              <Layout style={styles.featureText}>
                <Text category="s1">{t("createGroup.expenseAnalytics")}</Text>
                <Text category="c1" appearance="hint">
                  {t("createGroup.analyticsDescription")}
                </Text>
              </Layout>
            </Layout>

            <Layout style={styles.featureItem}>
              <Ionicons
                name="card-outline"
                size={20}
                color="#8F9BB3"
                style={styles.featureIcon}
              />
              <Layout style={styles.featureText}>
                <Text category="s1">
                  {t("createGroup.multiCurrencySupport")}
                </Text>
                <Text category="c1" appearance="hint">
                  {t("createGroup.multiCurrencyDescription")}
                </Text>
              </Layout>
            </Layout>
          </Card>

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
              ? t("createGroup.creatingGroup")
              : t("createGroup.createGroup")}
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
    padding: 16,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  toggleLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
  submitButton: {
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
  },
});
