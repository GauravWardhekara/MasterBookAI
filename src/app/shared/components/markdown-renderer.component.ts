import { Component, input, OnChanges, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

/**
 * Markdown Renderer Component
 * Renders markdown content safely with syntax highlighting support.
 */
@Component({
  selector: 'app-markdown-renderer',
  template: `<div class="mba-markdown" [innerHTML]="renderedHtml()"></div>`,
  styles: [`
    :host { display: contents; }
  `],
  standalone: true,
})
export class MarkdownRendererComponent implements OnChanges {
  content = input.required<string>();
  renderedHtml = signal<SafeHtml>('');

  constructor(private sanitizer: DomSanitizer) {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }

  ngOnChanges() {
    this.render();
  }

  private async render() {
    const raw = this.content() || '';
    try {
      const html = await marked.parse(raw);
      this.renderedHtml.set(this.sanitizer.bypassSecurityTrustHtml(html as string));
    } catch {
      this.renderedHtml.set(this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(raw)));
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
