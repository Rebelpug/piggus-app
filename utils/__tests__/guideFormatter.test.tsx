import React from 'react';
import { render } from '@testing-library/react-native';
import { GuideFormatter } from '../guideFormatter';

describe('GuideFormatter', () => {
  const mockColors = {
    text: '#000000',
    primary: '#007AFF',
    muted: '#666666',
    background: '#FFFFFF',
  };

  let formatter: GuideFormatter;

  beforeEach(() => {
    formatter = new GuideFormatter(mockColors);
  });

  describe('Bold text formatting', () => {
    it('should render bold text correctly', () => {
      const content = 'This is **bold text** in a paragraph.';
      const elements = formatter.renderContent(content);
      
      expect(elements).toHaveLength(1);
      // The element should be a paragraph containing both regular and bold text
    });

    it('should handle multiple bold sections', () => {
      const content = 'Text with **first bold** and **second bold** sections.';
      const elements = formatter.renderContent(content);
      
      expect(elements).toHaveLength(1);
    });

    it('should handle bold text at the beginning', () => {
      const content = '**Bold start** followed by regular text.';
      const elements = formatter.renderContent(content);
      
      expect(elements).toHaveLength(1);
    });

    it('should handle bold text at the end', () => {
      const content = 'Regular text followed by **bold end**.';
      const elements = formatter.renderContent(content);
      
      expect(elements).toHaveLength(1);
    });

    it('should handle entire paragraph as bold', () => {
      const content = '**Entire paragraph is bold**';
      const elements = formatter.renderContent(content);
      
      expect(elements).toHaveLength(1);
    });
  });

  describe('Mixed formatting', () => {
    it('should handle bold and italic together', () => {
      const content = 'Text with **bold** and *italic* formatting.';
      const elements = formatter.renderContent(content);
      
      expect(elements).toHaveLength(1);
    });

    it('should handle bold and code together', () => {
      const content = 'Text with **bold** and `code` formatting.';
      const elements = formatter.renderContent(content);
      
      expect(elements).toHaveLength(1);
    });

    it('should handle all three formats together', () => {
      const content = 'Text with **bold**, *italic*, and `code` formatting.';
      const elements = formatter.renderContent(content);
      
      expect(elements).toHaveLength(1);
    });
  });

  describe('List formatting with bold text', () => {
    it('should handle bold text in bullet lists', () => {
      const content = `- First item with **bold**
- Second item with **more bold**`;
      const elements = formatter.renderContent(content);
      
      expect(elements).toHaveLength(1); // Should be one list container
    });

    it('should handle bold text in numbered lists', () => {
      const content = `1. First item with **bold**
2. Second item with **more bold**`;
      const elements = formatter.renderContent(content);
      
      expect(elements).toHaveLength(1); // Should be one list container
    });
  });

  describe('Heading formatting with bold text', () => {
    it('should handle bold text in headings', () => {
      const content = '# Heading with **bold text**';
      const elements = formatter.renderContent(content);
      
      expect(elements).toHaveLength(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty bold markers', () => {
      const content = 'Text with **** empty bold markers.';
      const elements = formatter.renderContent(content);
      
      expect(elements).toHaveLength(1);
    });

    it('should handle unmatched bold markers', () => {
      const content = 'Text with **unmatched bold marker.';
      const elements = formatter.renderContent(content);
      
      expect(elements).toHaveLength(1);
    });

    it('should handle nested formatting attempts', () => {
      const content = 'Text with **bold *and italic* combined**.';
      const elements = formatter.renderContent(content);
      
      expect(elements).toHaveLength(1);
    });
  });
});