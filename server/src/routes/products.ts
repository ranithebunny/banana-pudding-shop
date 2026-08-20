import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/auditLog';
import { getCurrentStock } from '../lib/inventory';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WEBP images are allowed.'));
    }
  },
});

function handleUploadError(err: any, req: any, res: any, next: any) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image is too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
}

async function uploadProductImage(file: Express.Multer.File): Promise<string> {
  const fileExt = file.originalname.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

  const { error } = await supabaseAdmin.storage
    .from('product-images')
    .upload(fileName, file.buffer, { contentType: file.mimetype });

  if (error) throw error;

  const { data } = supabaseAdmin.storage.from('product-images').getPublicUrl(fileName);
  return data.publicUrl;
}

// GET /api/products — public, only active products, with current stock
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    const productsWithStock = await Promise.all(
      products.map(async (product) => ({
        ...product,
        stock: await getCurrentStock(product.id),
      }))
    );

    res.json(productsWithStock);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/products/:id — public
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const stock = await getCurrentStock(product.id);
    res.json({ ...product, stock });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/products — staff/owner only
router.post('/', authenticate, authorize('STAFF', 'OWNER'), upload.single('image'), handleUploadError, async (req, res) => {
  try {
    const { name, description, price, cost, categoryId, variantGroup, variantLabel, isAddOn } = req.body;

    if (!name || price === undefined || cost === undefined) {
      return res.status(400).json({ error: 'Name, price, and cost are required.' });
    }

    let imageUrl: string | undefined;
    if (req.file) {
      imageUrl = await uploadProductImage(req.file);
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: Number(price),
        cost: Number(cost),
        categoryId: categoryId || undefined,
        image: imageUrl,
        variantGroup: variantGroup || undefined,
        variantLabel: variantLabel || undefined,
        isAddOn: isAddOn === 'true' || isAddOn === true,
      },
    });

    await logAction(req.user!.userId, 'Product created', 'Product', product.id);

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// PATCH /api/products/:id — staff/owner only
router.patch('/:id', authenticate, authorize('STAFF', 'OWNER'), upload.single('image'), handleUploadError, async (req, res) => {
  try {
    const { name, description, price, cost, categoryId, isActive, variantGroup, variantLabel, isAddOn } = req.body;

    let imageUrl: string | undefined;
    if (req.file) {
      imageUrl = await uploadProductImage(req.file);
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        price: price !== undefined ? Number(price) : undefined,
        cost: cost !== undefined ? Number(cost) : undefined,
        categoryId: categoryId || undefined,
        isActive: isActive !== undefined ? isActive === 'true' || isActive === true : undefined,
        variantGroup: variantGroup !== undefined ? (variantGroup || null) : undefined,
        variantLabel: variantLabel !== undefined ? (variantLabel || null) : undefined,
        isAddOn: isAddOn !== undefined ? (isAddOn === 'true' || isAddOn === true) : undefined,
        ...(imageUrl && { image: imageUrl }),
      },
    });

    await logAction(req.user!.userId, 'Product edited', 'Product', product.id);

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;