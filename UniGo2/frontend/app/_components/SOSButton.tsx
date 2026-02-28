import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../_constants/theme';
import { useAppStore, EmergencyContact } from '../_store/appStore';
import { GlassContainer } from './GlassContainer';

export const SOSButton: React.FC = () => {
  const { 
    emergencyContacts, 
    callPolice, 
    alertEmergencyContacts,
    addEmergencyContact,
    removeEmergencyContact,
    setEmergencyContacts,
  } = useAppStore();
  
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showEditContacts, setShowEditContacts] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const handleSOSPress = () => {
    setShowSOSModal(true);
  };

  const handleCallPolice = () => {
    Alert.alert(
      '🚨 Call Police',
      'Are you sure you want to call the police (100)?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call Now', 
          style: 'destructive',
          onPress: () => {
            callPolice();
            setShowSOSModal(false);
          }
        },
      ]
    );
  };

  const handleAlertContacts = () => {
    if (emergencyContacts.length === 0) {
      Alert.alert('No Contacts', 'Please add emergency contacts first.');
      setShowEditContacts(true);
      return;
    }

    Alert.alert(
      '📱 Alert Emergency Contacts',
      `This will send an SOS message to:\n${emergencyContacts.map(c => `• ${c.name}`).join('\n')}\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Alert', 
          onPress: () => {
            alertEmergencyContacts();
            setShowSOSModal(false);
          }
        },
      ]
    );
  };

  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      Alert.alert('Error', 'Please enter both name and phone number');
      return;
    }

    if (emergencyContacts.length >= 3) {
      Alert.alert('Limit Reached', 'You can only have 3 emergency contacts. Remove one first.');
      return;
    }

    const newContact: EmergencyContact = {
      id: `contact-${Date.now()}`,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
    };

    addEmergencyContact(newContact);
    setNewContactName('');
    setNewContactPhone('');
    Alert.alert('Success', `${newContact.name} added as emergency contact.`);
  };

  const handleRemoveContact = (contact: EmergencyContact) => {
    Alert.alert(
      'Remove Contact',
      `Remove ${contact.name} from emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeEmergencyContact(contact.id)
        },
      ]
    );
  };

  return (
    <>
      {/* SOS Button */}
      <TouchableOpacity 
        style={styles.sosButton}
        onPress={handleSOSPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FF3B30', '#FF6B6B']}
          style={styles.sosGradient}
        >
          <Ionicons name="warning" size={24} color={COLORS.white} />
          <Text style={styles.sosText}>SOS</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* SOS Modal */}
      <Modal
        visible={showSOSModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSOSModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={40} color="#FF3B30" />
              <Text style={styles.modalTitle}>Emergency SOS</Text>
              <Text style={styles.modalSubtitle}>Choose an action below</Text>
            </View>

            {/* Call Police */}
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleCallPolice}
            >
              <LinearGradient
                colors={['#FF3B30', '#CC2F26']}
                style={styles.actionGradient}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name="call" size={28} color={COLORS.white} />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>Call Police (100)</Text>
                  <Text style={styles.actionDesc}>Emergency services</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>

            {/* Alert Emergency Contacts */}
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleAlertContacts}
            >
              <LinearGradient
                colors={[COLORS.orange, '#E67E22']}
                style={styles.actionGradient}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name="people" size={28} color={COLORS.white} />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>Alert {emergencyContacts.length} Contacts</Text>
                  <Text style={styles.actionDesc}>Send SOS to friends/family</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>

            {/* Manage Contacts */}
            <TouchableOpacity 
              style={styles.manageButton}
              onPress={() => setShowEditContacts(!showEditContacts)}
            >
              <Ionicons name="settings-outline" size={20} color={COLORS.orange} />
              <Text style={styles.manageText}>Manage Emergency Contacts</Text>
            </TouchableOpacity>

            {/* Edit Contacts Section */}
            {showEditContacts && (
              <View style={styles.contactsSection}>
                <Text style={styles.contactsTitle}>Emergency Contacts ({emergencyContacts.length}/3)</Text>
                
                {/* Current Contacts */}
                {emergencyContacts.map((contact) => (
                  <View key={contact.id} style={styles.contactRow}>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactPhone}>{contact.phone}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleRemoveContact(contact)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Add New Contact */}
                {emergencyContacts.length < 3 && (
                  <View style={styles.addContactForm}>
                    <TextInput
                      style={styles.input}
                      placeholder="Name"
                      placeholderTextColor={COLORS.whiteAlpha60}
                      value={newContactName}
                      onChangeText={setNewContactName}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Phone (+91...)"
                      placeholderTextColor={COLORS.whiteAlpha60}
                      value={newContactPhone}
                      onChangeText={setNewContactPhone}
                      keyboardType="phone-pad"
                    />
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={handleAddContact}
                    >
                      <Ionicons name="add-circle" size={20} color={COLORS.white} />
                      <Text style={styles.addButtonText}>Add Contact</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Close Button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowSOSModal(false)}
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  sosButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  sosGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
  },
  sosText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.whiteAlpha60,
    marginTop: 4,
  },
  actionButton: {
    marginBottom: 12,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  actionDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    marginTop: 8,
  },
  manageText: {
    color: COLORS.orange,
    fontSize: 14,
    fontWeight: '500',
  },
  contactsSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BORDER_RADIUS.md,
    padding: 16,
    marginTop: 8,
  },
  contactsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    marginBottom: 8,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  contactPhone: {
    fontSize: 12,
    color: COLORS.whiteAlpha60,
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  addContactForm: {
    marginTop: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    color: COLORS.white,
    fontSize: 14,
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.orange,
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    gap: 8,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  closeText: {
    color: COLORS.whiteAlpha60,
    fontSize: 16,
    fontWeight: '500',
  },
});
