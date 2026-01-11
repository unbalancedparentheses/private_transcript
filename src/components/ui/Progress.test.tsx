import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from './Progress';

describe('Progress', () => {
  it('should render the progress bar', () => {
    render(<Progress value={50} />);
    const progressBar = document.querySelector('.bg-primary');
    expect(progressBar).toBeInTheDocument();
  });

  it('should set correct width based on value', () => {
    render(<Progress value={75} />);
    const progressBar = document.querySelector('.bg-primary') as HTMLElement;
    expect(progressBar.style.width).toBe('75%');
  });

  it('should clamp value to 0-100 range', () => {
    render(<Progress value={150} />);
    const progressBar = document.querySelector('.bg-primary') as HTMLElement;
    expect(progressBar.style.width).toBe('100%');
  });

  it('should handle negative values', () => {
    render(<Progress value={-10} />);
    const progressBar = document.querySelector('.bg-primary') as HTMLElement;
    expect(progressBar.style.width).toBe('0%');
  });

  it('should show label when showLabel is true', () => {
    render(<Progress value={50} showLabel />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should show custom label when provided', () => {
    render(<Progress value={50} label="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show both custom label and percentage', () => {
    render(<Progress value={50} label="Loading..." showLabel />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should calculate percentage correctly with custom max', () => {
    render(<Progress value={25} max={50} showLabel />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<Progress value={50} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render indeterminate progress bar', () => {
    render(<Progress value={0} indeterminate />);
    const progressBar = document.querySelector('.bg-primary') as HTMLElement;
    expect(progressBar.style.animation).toContain('indeterminate');
  });

  it('should not show percentage when indeterminate', () => {
    render(<Progress value={50} indeterminate showLabel label="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('should handle zero value', () => {
    render(<Progress value={0} />);
    const progressBar = document.querySelector('.bg-primary') as HTMLElement;
    expect(progressBar.style.width).toBe('0%');
  });

  it('should handle 100% value', () => {
    render(<Progress value={100} />);
    const progressBar = document.querySelector('.bg-primary') as HTMLElement;
    expect(progressBar.style.width).toBe('100%');
  });
});
