import {View, Text, StyleSheet, TouchableOpacity, Alert, TextInput} from 'react-native';
import {useAuth} from "@/context/AuthContext";
import {useState} from "react";

const HomeScreen: React.FC = () => {
    const { user, signOut, encryptData, decryptData } = useAuth();
    const [message, setMessage] = useState('');
    const [encryptedMessage, setEncryptedMessage] = useState('');
    const [decryptedMessage, setDecryptedMessage] = useState('');

    const handleEncrypt = async () => {
        if (!message) return;
        try {
            const encrypted = await encryptData(message);
            setEncryptedMessage(encrypted || '');
        } catch (error) {
            console.error('Encryption error:', error);
            Alert.alert('Error', 'Failed to encrypt message');
        }
    };

    const handleDecrypt = async () => {
        if (!encryptedMessage) return;
        try {
            const decrypted = await decryptData(encryptedMessage);
            setDecryptedMessage(decrypted);
        } catch (error) {
            console.error('Decryption error:', error);
            Alert.alert('Error', 'Failed to decrypt message');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome!</Text>
            <Text style={styles.subtitle}>You are logged in as: {user?.email}</Text>

            <View style={styles.encryptionDemo}>
                <Text style={styles.sectionTitle}>Encryption Demo</Text>

                <TextInput
                    style={styles.input}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Enter a message to encrypt"
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleEncrypt}
                    disabled={!message}
                >
                    <Text style={styles.buttonText}>Encrypt</Text>
                </TouchableOpacity>

                {encryptedMessage ? (
                    <>
                        <View style={styles.resultContainer}>
                            <Text style={styles.resultTitle}>Encrypted:</Text>
                            <Text style={styles.resultText}>
                                {encryptedMessage.substring(0, 32)}...
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleDecrypt}
                        >
                            <Text style={styles.buttonText}>Decrypt</Text>
                        </TouchableOpacity>
                    </>
                ) : null}

                {decryptedMessage ? (
                    <View style={styles.resultContainer}>
                        <Text style={styles.resultTitle}>Decrypted:</Text>
                        <Text style={styles.resultText}>{decryptedMessage}</Text>
                    </View>
                ) : null}
            </View>

            <TouchableOpacity
                style={styles.signOutButton}
                onPress={signOut}
            >
                <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#F5F5F5',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
    },
    encryptionDemo: {
        backgroundColor: '#FFF',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 15,
    },
    input: {
        backgroundColor: '#F9F9F9',
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 8,
        padding: 15,
        marginBottom: 15,
    },
    button: {
        backgroundColor: '#4A69FF',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
        marginBottom: 15,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    resultContainer: {
        backgroundColor: '#F0F7FF',
        borderRadius: 8,
        padding: 15,
        marginBottom: 15,
    },
    resultTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 5,
    },
    resultText: {
        fontSize: 14,
        fontFamily: 'monospace',
    },
    signOutButton: {
        backgroundColor: '#FF4A69',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
    },
    signOutText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default HomeScreen;
