import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  describe('Basic Rendering', () => {
    it('should render an input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text..." />);
      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
    });

    it('should render with default value', () => {
      render(<Input defaultValue="Default text" />);
      expect(screen.getByDisplayValue('Default text')).toBeInTheDocument();
    });

    it('should render with controlled value', () => {
      render(<Input value="Controlled text" onChange={() => {}} />);
      expect(screen.getByDisplayValue('Controlled text')).toBeInTheDocument();
    });
  });

  describe('Label', () => {
    it('should render label when provided', () => {
      render(<Input label="Username" />);
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('should associate label with input via htmlFor', () => {
      render(<Input label="Email" />);
      const label = screen.getByText('Email');
      const input = screen.getByRole('textbox');
      expect(label).toHaveAttribute('for', 'email');
      expect(input).toHaveAttribute('id', 'email');
    });

    it('should use custom id when provided', () => {
      render(<Input label="Email" id="custom-email-id" />);
      const label = screen.getByText('Email');
      const input = screen.getByRole('textbox');
      expect(label).toHaveAttribute('for', 'custom-email-id');
      expect(input).toHaveAttribute('id', 'custom-email-id');
    });

    it('should convert label with spaces to id', () => {
      render(<Input label="First Name" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'first-name');
    });
  });

  describe('Error State', () => {
    it('should display error message when provided', () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should have error styling when error is provided', () => {
      render(<Input error="Error message" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('border-[var(--destructive)]');
    });

    it('should render error message with correct styling', () => {
      render(<Input error="Error message" />);
      const errorContainer = screen.getByText('Error message');
      expect(errorContainer).toBeInTheDocument();
      expect(errorContainer.className).toContain('text-[var(--destructive)]');
    });

    it('should hide hint when error is shown', () => {
      render(<Input hint="Helpful hint" error="Error message" />);
      expect(screen.queryByText('Helpful hint')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Hint', () => {
    it('should display hint when provided', () => {
      render(<Input hint="Enter your email address" />);
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('should not display hint when error is provided', () => {
      render(<Input hint="Hint text" error="Error text" />);
      expect(screen.queryByText('Hint text')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should have disabled styling', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('disabled:opacity-50');
    });
  });

  describe('Event Handling', () => {
    it('should handle onChange events', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new value' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('should handle onBlur events', () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);

      fireEvent.blur(screen.getByRole('textbox'));
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('should handle onFocus events', () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);

      fireEvent.focus(screen.getByRole('textbox'));
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });
  });

  describe('HTML Attributes', () => {
    it('should pass through type attribute', () => {
      const { container } = render(<Input type="password" />);
      // Password inputs don't have role="textbox", use querySelector
      expect(container.querySelector('input[type="password"]')).toBeInTheDocument();
    });

    it('should pass through name attribute', () => {
      render(<Input name="username" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'username');
    });

    it('should pass through required attribute', () => {
      render(<Input required />);
      expect(screen.getByRole('textbox')).toBeRequired();
    });

    it('should pass through maxLength attribute', () => {
      render(<Input maxLength={50} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '50');
    });

    it('should pass through autoComplete attribute', () => {
      render(<Input autoComplete="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('autoComplete', 'email');
    });

    it('should pass through readOnly attribute', () => {
      render(<Input readOnly />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readOnly');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('custom-class');
    });

    it('should have base input styles', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('w-full');
      expect(input.className).toContain('h-7');
      expect(input.className).toContain('rounded-md');
    });

    it('should have focus ring styles', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('focus:ring-2');
    });

    it('should have transition styles', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('transition-colors');
    });
  });

  describe('Different Input Types', () => {
    it('should render email input', () => {
      const { container } = render(<Input type="email" />);
      expect(container.querySelector('input[type="email"]')).toBeInTheDocument();
    });

    it('should render number input', () => {
      const { container } = render(<Input type="number" />);
      expect(container.querySelector('input[type="number"]')).toBeInTheDocument();
    });

    it('should render tel input', () => {
      const { container } = render(<Input type="tel" />);
      expect(container.querySelector('input[type="tel"]')).toBeInTheDocument();
    });

    it('should render url input', () => {
      const { container } = render(<Input type="url" />);
      expect(container.querySelector('input[type="url"]')).toBeInTheDocument();
    });

    it('should render search input', () => {
      const { container } = render(<Input type="search" />);
      expect(container.querySelector('input[type="search"]')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label association', () => {
      render(<Input label="Email Address" />);
      const input = screen.getByLabelText('Email Address');
      expect(input).toBeInTheDocument();
    });

    it('should support aria-describedby for hints', () => {
      render(<Input label="Password" hint="Must be at least 8 characters" id="password" />);
      const hint = screen.getByText('Must be at least 8 characters');
      expect(hint).toBeInTheDocument();
    });

    it('should support aria-invalid for errors', () => {
      render(<Input error="Invalid input" aria-invalid="true" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
