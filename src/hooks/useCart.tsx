import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
	children: ReactNode;
}

interface UpdateProductAmount {
	productId: number;
	amount: number;
}

interface CartContextData {
	cart: Product[];
	addProduct: (productId: number) => Promise<void>;
	removeProduct: (productId: number) => void;
	updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
	const [cart, setCart] = useState<Product[]>(() => {
		const storagedCart = localStorage.getItem('@RocketShoes:cart');

		if (storagedCart) {
			return JSON.parse(storagedCart);
		}

		return [];
	});

	const addProduct = async (productId: number) => {
		try {
			const stock = await api.get<Stock>(`stock/${productId}`);

			if (stock.data.amount < 1) {
				toast.error('Quantidade solicitada fora de estoque');
				return;
			}

			const { data } = await api.get(`products/${productId}`);

			const findProductInCart = [...cart].find(
				(product) => product.id === data.id
			);

			if (!findProductInCart) {
				const newCart = [
					...cart,
					{
						...data,
						amount: 1,
					},
				];
				localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
				setCart(newCart);
				return;
			}
			updateProductAmount({
				productId: findProductInCart.id,
				amount: findProductInCart.amount + 1,
			});
		} catch {
			toast.error('Erro na adição do produto');
		}
	};

	const removeProduct = (productId: number) => {
		try {
			const findProduct = [...cart].find((product) => product.id === productId);

			if (!findProduct) {
				throw new Error();
			}

			const removeProduct = [...cart].filter(
				(product) => product.id !== productId
			);

			setCart(removeProduct);
			localStorage.setItem('@RocketShoes:cart', JSON.stringify(removeProduct));
		} catch {
			toast.error('Erro na remoção do produto');
		}
	};

	const updateProductAmount = async ({
		productId,
		amount,
	}: UpdateProductAmount) => {
		try {
			const copy = [...cart];
			const findProduct = copy.findIndex((product) => product.id === productId);

			const { data } = await api.get<Stock>(`stock/${productId}`);

			if (amount <= 0) {
				return;
			}

			if (amount > data.amount) {
				toast.error('Quantidade solicitada fora de estoque');
				return;
			}
			copy[findProduct].amount = amount;
			setCart(copy);
			localStorage.setItem('@RocketShoes:cart', JSON.stringify(copy));
		} catch {
			toast.error('Erro na alteração de quantidade do produto');
		}
	};

	return (
		<CartContext.Provider
			value={{ cart, addProduct, removeProduct, updateProductAmount }}
		>
			{children}
		</CartContext.Provider>
	);
}

export function useCart(): CartContextData {
	const context = useContext(CartContext);

	return context;
}
