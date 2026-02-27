import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../constants/theme';
import useAppStore from '../store/appStore';
import GlassContainer from './GlassContainer';

interface DriverOnboardingModalProps {
    visible: boolean;
    onClose: () => void;
    onComplete: () => void;
}

const DriverOnboardingModal: React.FC<DriverOnboardingModalProps> = ({
    visible,
    onClose,
    onComplete,
}) => {
    const { user, onboardDriver } = useAppStore();
    const [email, setEmail] = useState('');
    const [vehicle, setVehicle] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleOnboard = async () => {
        if (!email || !vehicle) {
            setError('Please fill in all fields');
            return;
        }

        if (!email.includes('@')) {
            setError('Please enter a valid college email');
            return;
        }

        setLoading(true);
        setError('');

        const success = await onboardDriver(email, vehicle);
        setLoading(false);

        if (success) {
            onComplete();
        } else {
            setError('Something went wrong. Please try again.');
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.centeredView}
                >
                    <GlassContainer style={styles.modalView}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Driver Onboarding</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={COLORS.whiteAlpha60} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.iconContainer}>
                            <Ionicons name="car-sport" size={60} color={COLORS.emeraldGreen} />
                        </View>

                        <Text style={styles.description}>
                            Verify your student status to start hosting rides and earning tokens.
                        </Text>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>College Email</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail" size={20} color={COLORS.emeraldGreen} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="name@college.edu"
                                    placeholderTextColor={COLORS.whiteAlpha40}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Vehicle Details</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="information-circle" size={20} color={COLORS.emeraldGreen} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Model, Plate Number"
                                    placeholderTextColor={COLORS.whiteAlpha40}
                                    value={vehicle}
                                    onChangeText={setVehicle}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.onboardButton, loading && styles.disabledButton]}
                            onPress={handleOnboard}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <>
                                    <Ionicons name="shield-checkmark" size={20} color={COLORS.white} />
                                    <Text style={styles.onboardButtonText}>Verify & Join</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </GlassContainer>
                </KeyboardAvoidingView>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    modalView: {
        width: '100%',
        padding: SPACING.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    title: {
        fontSize: FONTS.sizes.xl,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    closeButton: {
        padding: 4,
    },
    iconContainer: {
        alignItems: 'center',
        marginVertical: SPACING.lg,
    },
    description: {
        fontSize: FONTS.sizes.md,
        color: COLORS.whiteAlpha80,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        lineHeight: 22,
    },
    errorText: {
        color: COLORS.orange,
        fontSize: FONTS.sizes.sm,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.whiteAlpha60,
        marginBottom: SPACING.xs,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.slate900,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.emeraldGreen + '40',
    },
    input: {
        flex: 1,
        padding: SPACING.md,
        fontSize: FONTS.sizes.md,
        color: COLORS.white,
    },
    onboardButton: {
        backgroundColor: COLORS.emeraldGreen,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.md,
        gap: SPACING.sm,
        marginTop: SPACING.md,
    },
    disabledButton: {
        opacity: 0.6,
    },
    onboardButtonText: {
        fontSize: FONTS.sizes.md,
        fontWeight: 'bold',
        color: COLORS.white,
    },
});

export default DriverOnboardingModal;
