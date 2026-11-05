import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('blog_articles')
export class BlogArticle {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 200 }) title: string;
  @Column({ length: 180, unique: true }) slug: string;
  @Column({ type: 'text' }) excerpt: string;
  @Column({ type: 'json' }) content: Record<string, unknown>;
  @Column({ length: 16, default: 'draft' }) status: 'draft' | 'published';
  @Column({ default: false }) featured: boolean;
  @Column({ type: 'varchar', length: 2048, nullable: true }) cover:
    string | null;
  @Column({ length: 200, default: '' }) metaTitle: string;
  @Column({ type: 'text' }) metaDescription: string;
  @Column({ default: true }) indexable: boolean;
  @Column({ default: true }) follow: boolean;
  @Column({ type: 'datetime', nullable: true }) publishedAt: Date | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt: Date;
}
