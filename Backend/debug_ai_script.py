import sys
import traceback
from ai import handle_ai_command, AICommand

def test_direct():
    print("Testing handle_ai_command directly...")
    try:
        cmd = AICommand(
            text="2 soap",
            context="daily_sell",
            user_id=1,
            payment_mode="cash"
        )
        print(f"Command created: {cmd}")
        result = handle_ai_command(cmd)
        print("Result:", result)
    except Exception:
        traceback.print_exc()

if __name__ == "__main__":
    test_direct()
