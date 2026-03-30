/**
 * Link Search and Filter Service
 * 
 * Provides search and filtering capabilities for shared links
 */

import { SharedLink } from './link-storage-service';

export interface SearchFilters {
  query?: string;
  platform?: string;
  status?: 'unread' | 'read' | 'archived' | 'shared';
  isFavorite?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
}

export class LinkSearchService {
  /**
   * Search and filter links
   */
  static searchLinks(links: SharedLink[], filters: SearchFilters): SharedLink[] {
    let filtered = [...links];

    // Text search (title, description, url, author)
    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(link =>
        link.title?.toLowerCase().includes(query) ||
        link.description?.toLowerCase().includes(query) ||
        link.url.toLowerCase().includes(query) ||
        link.author?.toLowerCase().includes(query) ||
        link.domain?.toLowerCase().includes(query)
      );
    }

    // Platform filter
    if (filters.platform) {
      filtered = filtered.filter(link => link.platform === filters.platform);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(link => link.status === filters.status);
    }

    // Favorite filter
    if (filters.isFavorite !== undefined) {
      filtered = filtered.filter(link => link.isFavorite === filters.isFavorite);
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(link => 
        new Date(link.createdAt) >= filters.dateFrom!
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(link => 
        new Date(link.createdAt) <= filters.dateTo!
      );
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(link =>
        link.tags?.some(tag => filters.tags!.includes(tag))
      );
    }

    return filtered;
  }

  /**
   * Get unique platforms from links
   */
  static getUniquePlatforms(links: SharedLink[]): string[] {
    const platforms = new Set(links.map(link => link.platform).filter(Boolean));
    return Array.from(platforms) as string[];
  }

  /**
   * Get unique tags from links
   */
  static getUniqueTags(links: SharedLink[]): string[] {
    const tags = new Set<string>();
    links.forEach(link => {
      link.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }

  /**
   * Sort links by various criteria
   */
  static sortLinks(
    links: SharedLink[],
    sortBy: 'date' | 'title' | 'platform',
    order: 'asc' | 'desc' = 'desc'
  ): SharedLink[] {
    const sorted = [...links];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'title':
          comparison = (a.title || a.url).localeCompare(b.title || b.url);
          break;
        case 'platform':
          comparison = (a.platform || '').localeCompare(b.platform || '');
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Get link statistics
   */
  static getStatistics(links: SharedLink[]) {
    const total = links.length;
    const unread = links.filter(l => l.status === 'unread').length;
    const read = links.filter(l => l.status === 'read').length;
    const archived = links.filter(l => l.status === 'archived').length;
    const shared = links.filter(l => l.status === 'shared').length;
    const favorites = links.filter(l => l.isFavorite).length;

    const platformCounts = links.reduce((acc, link) => {
      const platform = link.platform || 'unknown';
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      unread,
      read,
      archived,
      shared,
      favorites,
      platformCounts,
    };
  }
}
