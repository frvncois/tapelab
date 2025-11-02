import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TouchableOpacity, Alert } from 'react-native';
import type { Region } from '../types/session';

type RegionViewProps = {
  region: Region;
  pixelsPerSecond: number;
  onCrop?: (regionId: string) => void;
  onMove?: (regionId: string) => void;
  onDelete?: (regionId: string) => void;
};

export default function RegionView({ region, pixelsPerSecond, onCrop, onMove, onDelete }: RegionViewProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const left = region.startTime * pixelsPerSecond;
  const width = (region.endTime - region.startTime) * pixelsPerSecond;
  const isLive = region.isLive;

  const handleLongPress = (event: any) => {
    if (isLive) return; // Don't show menu for live recording regions

    event.target.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      setMenuPosition({ x: pageX, y: pageY + height });
      setMenuVisible(true);
    });
  };

  const handleCrop = () => {
    setMenuVisible(false);
    onCrop?.(region.id);
  };

  const handleMove = () => {
    setMenuVisible(false);
    onMove?.(region.id);
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Region',
      'Are you sure you want to delete this region?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(region.id)
        }
      ]
    );
  };

  return (
    <>
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={[
          styles.region,
          {
            left,
            width: Math.max(width, 12), // minimum width for visibility
            backgroundColor: isLive ? '#e51b1bff' : '#323531ff',
            borderColor: isLive ? '#fb743e93' : '#c4c4c420',
            opacity: isLive ? 0.8 : 1,
          },
        ]}
      >
        <Text style={styles.regionLabel} numberOfLines={1}>
          {region.id.substring(0, 8)}
        </Text>
      </Pressable>

      {/* Context Menu */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.menu, { left: menuPosition.x, top: menuPosition.y }]}>
            <TouchableOpacity style={styles.menuItem} onPress={handleCrop}>
              <Text style={styles.menuItemText}>✂️ Crop</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleMove}>
              <Text style={styles.menuItemText}>↔️ Move</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  region: {
    position: 'absolute',
    top: '35%',
    bottom: '15%',
    backgroundColor: '#42a32fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#9ca71eff',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  regionLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menu: {
    position: 'absolute',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#2a2a2a',
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  menuItemDanger: {
    color: '#FF3B30',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#3a3a3a',
  },
});
