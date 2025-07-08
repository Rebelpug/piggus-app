/**
 * TermsConditionsScreen.tsx
 * Terms and Conditions screen for the Piggus app
 */
import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar
} from 'react-native';
import { useRouter } from "expo-router";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const TermsConditionsScreen = () => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar 
                barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} 
                backgroundColor={colors.background} 
            />
            
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Terms and Conditions</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Content */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    <Text style={[styles.title, { color: colors.text }]}>Terms and Conditions</Text>
                    
                    <Text style={[styles.lastUpdated, { color: colors.icon }]}>Last Updated: 08/07/2025</Text>
                    
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Agreement to Terms</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        By downloading, installing, or using the Piggus mobile application ("App"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, do not use the App.
                    </Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        These Terms constitute a legally binding agreement between you and Rebelpug S.r.l., a company incorporated under Italian law, with registered address at Via Losanna 13, Biella, 13900, BI, Italia ("Company", "we", "us", or "our").
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>2. About Piggus</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        Piggus is a personal finance management application that provides:
                    </Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• Expense tracking and categorization</Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• Expense sharing capabilities with other users</Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• Investment tracking tools</Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• Educational guides on budgeting and investment management</Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• Premium features available through subscription</Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Privacy and Data Security</Text>
                    <Text style={[styles.subSectionTitle, { color: colors.text }]}>3.1 End-to-End Encryption</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        We prioritize your privacy. All personal financial data (expenses, investments, and related financial information) is encrypted end-to-end, meaning we cannot access, view, or process your financial information.
                    </Text>
                    
                    <Text style={[styles.subSectionTitle, { color: colors.text }]}>3.2 Technical Data Collection</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        We collect limited technical data necessary for app functionality through third-party services:
                    </Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• Expo: For app performance monitoring, crash reporting, and basic analytics</Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• Sentry: For error tracking, debugging, and app stability monitoring</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        This technical data may include device information, app usage patterns, error logs, and performance metrics, but does not include your personal financial data.
                    </Text>

                    <Text style={[styles.subSectionTitle, { color: colors.text }]}>3.3 Data Processing</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        For detailed information about data collection, processing, and your rights, please refer to our Privacy Policy, which is incorporated into these Terms by reference.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Account and Usage</Text>
                    <Text style={[styles.subSectionTitle, { color: colors.text }]}>4.1 Account Creation</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        You must create an account to use the App. You are responsible for:
                    </Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• Providing accurate and complete information</Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• Maintaining the confidentiality of your account credentials</Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• All activities that occur under your account</Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• Notifying us immediately of any unauthorized use</Text>

                    <Text style={[styles.subSectionTitle, { color: colors.text }]}>4.2 Acceptable Use</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        You agree to use the App only for lawful purposes and in accordance with these Terms. You may not:
                    </Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• Use the App for any illegal activities</Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• Attempt to gain unauthorized access to the App or other users' accounts</Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• Interfere with the App's operation or security features</Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• Share false or misleading information</Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• Use the App to harass, abuse, or harm others</Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• Violate any applicable laws or regulations</Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Subscription and Premium Features</Text>
                    <Text style={[styles.subSectionTitle, { color: colors.text }]}>5.1 Free Services</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        The App is currently available free of charge with basic functionality.
                    </Text>
                    
                    <Text style={[styles.subSectionTitle, { color: colors.text }]}>5.2 Premium Features</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        Premium features will be available for a monthly subscription fee. Details about premium features, pricing, and billing will be clearly displayed in the App before purchase.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Financial Disclaimer</Text>
                    <Text style={[styles.subSectionTitle, { color: colors.text }]}>6.1 Not Financial Advice</Text>
                    <Text style={[styles.important, { color: colors.primary }]}>
                        IMPORTANT: The Company is not a financial advisor, investment advisor, certified financial planner, or licensed financial professional. The guides, tips, educational content, and tools provided in the App are for informational and educational purposes only and do not constitute financial advice or recommendations.
                    </Text>

                    <Text style={[styles.subSectionTitle, { color: colors.text }]}>6.2 Your Responsibility and Risk Acknowledgment</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        You expressly acknowledge and agree that:
                    </Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• All financial and investment decisions are solely your responsibility</Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• You should consult with qualified, licensed professionals before making any financial decisions</Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• The Company is not responsible for any financial losses, damages, or consequences resulting from your use of the App</Text>
                    <Text style={[styles.listItem, { color: colors.text }]}>• All investments carry risk, including the potential loss of principal</Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Expense Sharing</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        The App allows you to share expense information with other users. You are responsible for ensuring accuracy of shared information and obtaining consent from others before sharing their information.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Intellectual Property</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        The App and all its content, features, and functionality are owned by Rebelpug S.r.l. and are protected by copyright, trademark, and other intellectual property laws.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>9. Disclaimers and Limitations</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        TO THE MAXIMUM EXTENT PERMITTED BY LAW, Rebelpug S.r.l. shall not be liable for any indirect, incidental, special, consequential, or punitive damages, loss of profits, revenue, or business opportunities.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>10. Age Restrictions</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        You must be at least 18 years old to use this App. If you are under 18, you may only use the App with the consent and supervision of a parent or legal guardian.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>11. Governing Law</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        These Terms are governed by Italian law. Any disputes shall be subject to the exclusive jurisdiction of the courts of Biella, Italy.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>12. Contact Information</Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        For questions about these Terms, please contact us at:
                    </Text>
                    <Text style={[styles.contact, { color: colors.text }]}>
                        Rebelpug S.r.l.{'\n'}
                        Via Losanna 13{'\n'}
                        Biella, 13900, BI, Italia{'\n'}
                        Email: legal@rebelpug.com
                    </Text>

                    <Text style={[styles.acceptance, { color: colors.primary }]}>
                        ACCEPTANCE
                    </Text>
                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        By using Piggus, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree to these Terms, you must not use the App.
                    </Text>

                    <Text style={[styles.version, { color: colors.icon }]}>
                        Version: 1.0{'\n'}
                        Effective Date: 08/07/2025
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    placeholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    lastUpdated: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 24,
        marginBottom: 12,
    },
    subSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    paragraph: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    listItem: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 4,
        paddingLeft: 8,
    },
    important: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
        fontWeight: '600',
    },
    contact: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
        fontFamily: 'monospace',
    },
    acceptance: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 24,
        marginBottom: 12,
        textAlign: 'center',
    },
    version: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 24,
        marginBottom: 32,
    },
});

export default TermsConditionsScreen;