import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import Launcher from '../Launcher';
import { useAppStore } from '../../app/appStore';
import { useVisionStore } from '../../vision/visionStore';

describe('Launcher', () => {
  beforeEach(() => {
    useAppStore.setState({ menuOpen: true, activeScene: 'shapes' });
    useVisionStore.setState({ status: 'running', calibrating: false, mode: 'browser' });
  });

  it('renders nothing when the menu is closed', () => {
    useAppStore.setState({ menuOpen: false });
    const { container } = render(<Launcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('calibrate closes the launcher so the overlay is reachable', () => {
    render(<Launcher />);
    fireEvent.click(screen.getByText(/calibrate/i));
    // overlay (z-2000) sits below the launcher (z-3000) — leaving the menu
    // open makes launcher-initiated calibration uncompletable
    expect(useAppStore.getState().menuOpen).toBe(false);
    expect(useVisionStore.getState().calibrating).toBe(true);
  });
});
