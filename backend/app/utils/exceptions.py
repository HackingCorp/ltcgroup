from fastapi import HTTPException, status


class CardNotFoundException(HTTPException):
    def __init__(self, card_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card {card_id} not found",
        )


class InsufficientBalanceException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance for this operation",
        )


class UnauthorizedCardAccessException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this card",
        )


class CardAlreadyBlockedException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Card is already blocked and cannot be modified",
        )


class UserAlreadyExistsException(HTTPException):
    def __init__(self, field: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with this {field} already exists",
        )


class InvalidCredentialsException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
