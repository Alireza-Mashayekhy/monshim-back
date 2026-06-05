import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @Column({
    length: 255,
  })
  name: string;

  @Column({
    nullable: true,
  })
  image: string;

  @Column()
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({
    default: true,
  })
  isActive: boolean;

  @Column({
    unique: true,
  })
  slug: string;

  @Column({
    nullable: true,
  })
  parentId: string | null;

  @ManyToOne(() => Category, category => category.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'parentId',
  })
  parent: Category | null;

  @OneToMany(() => Category, category => category.parent)
  children: Category[];
}
